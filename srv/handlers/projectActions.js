const cds = require('@sap/cds');
 
module.exports = (srv) => {
    const {
        PartnerAssignments,
        ProjectAssignments,
        ProjectMaster,
        ChangeLogs
    } = srv.entities;
 
    function now() {
        return new Date().toISOString();
    }
 
    function currentUser(req) {
        return req.user?.id || 'anonymous';
    }
 
    /*
     * UNBOUND service-level actions.
     *
     * Previously these were bound to PartnerAssignments. That works fine
     * when the client calls them via the top-level entity set
     * (/PartnerAssignments(ID=...)/...), but UI5's OData V4 model
     * canonicalizes an entity's path to whatever navigation route it
     * already has a cached context for - in this app that's always
     * /Users(...)/customers(...) or /Users(...)/suppliers(...), both
     * filtered compositions onto PartnerAssignments. CAP's draft runtime
     * treats an action reached that way as a distinct target signature
     * ("Users.drafts/customers") that a handler bound to plain
     * PartnerAssignments (active or .drafts) does not match, regardless
     * of how it's registered - producing a persistent 501.
     *
     * Making these unbound sidesteps the problem entirely: the client
     * now passes partnerID and isActiveEntity explicitly as parameters,
     * and dispatch happens purely by action name at the service root -
     * no entity-target resolution, so no navigation-path sensitivity.
     */
 
    srv.on('addProjects', async (req) => {
        const { partnerID, isActiveEntity, projectIds } = req.data;
        const isActive = isActiveEntity !== false;
 
        console.log('[DEBUG addProjects] partnerID:', partnerID, '| isActive:', isActive);
 
        if (!Array.isArray(projectIds) || projectIds.length === 0) {
            return [];
        }
 
        const PartnerTarget = isActive ? PartnerAssignments : PartnerAssignments.drafts;
        const ProjectTarget = isActive ? ProjectAssignments : ProjectAssignments.drafts;
 
        const partner = await SELECT.one
            .from(PartnerTarget)
            .where({ ID: partnerID });
 
        if (!partner) {
            return req.reject(404, 'Partner assignment not found');
        }
 
        const uniqueProjectIds = [...new Set(projectIds)];
 
        const activeProjects = await SELECT
            .from(ProjectMaster)
            .where({
                projectId: { in: uniqueProjectIds },
                status: 'A'
            });
 
        if (activeProjects.length !== uniqueProjectIds.length) {
            return req.reject(400, 'One or more selected projects do not exist or are inactive');
        }
 
        const existingAssignments = await SELECT
            .from(ProjectTarget)
            .where({ partner_ID: partnerID });
 
        const existingProjectIds = new Set(existingAssignments.map(row => row.projectId));
 
        const projectsToInsert = activeProjects
            .filter(project => !existingProjectIds.has(project.projectId))
            .map(project => ({
                ID: cds.utils.uuid(),
                partner_ID: partnerID,
                projectId: project.projectId,
                projectName: project.projectName,
                ...(isActive ? {} : {
                    IsActiveEntity: false,
                    DraftAdministrativeData_DraftUUID: partner.DraftAdministrativeData_DraftUUID
                })
            }));
 
        if (!projectsToInsert.length) {
            return [];
        }
 
        await INSERT.into(ProjectTarget).entries(projectsToInsert);
 
        if (isActive) {
            const logEntries = projectsToInsert.map(row => ({
                ID: cds.utils.uuid(),
                user_email: partner.user_email,
                objectType: 'PROJECT_ASSIGNMENT',
                objectKey: `${partnerID}/${row.projectId}`,
                fieldName: null,
                oldValue: null,
                newValue: row.projectId,
                changeType: 'CREATE',
                changedBy: currentUser(req),
                changedOn: now()
            }));
 
            await INSERT.into(ChangeLogs).entries(logEntries);
        }
 
        return projectsToInsert;
    });
 
 
    srv.on('removeProjects', async (req) => {
        const { partnerID, isActiveEntity, projectIds } = req.data;
        const isActive = isActiveEntity !== false;
 
        if (!Array.isArray(projectIds) || projectIds.length === 0) {
            return true;
        }
 
        const PartnerTarget = isActive ? PartnerAssignments : PartnerAssignments.drafts;
        const ProjectTarget = isActive ? ProjectAssignments : ProjectAssignments.drafts;
 
        const partner = await SELECT.one
            .from(PartnerTarget)
            .where({ ID: partnerID });
 
        if (!partner) {
            return req.reject(404, 'Partner assignment not found');
        }
 
        const uniqueProjectIds = [...new Set(projectIds)];
 
        const assignmentsToDelete = await SELECT
            .from(ProjectTarget)
            .where({
                partner_ID: partnerID,
                projectId: { in: uniqueProjectIds }
            });
 
        if (!assignmentsToDelete.length) {
            return true;
        }
 
        await DELETE
            .from(ProjectTarget)
            .where({ ID: { in: assignmentsToDelete.map(row => row.ID) } });
 
        if (isActive) {
            const logEntries = assignmentsToDelete.map(row => ({
                ID: cds.utils.uuid(),
                user_email: partner.user_email,
                objectType: 'PROJECT_ASSIGNMENT',
                objectKey: `${partnerID}/${row.projectId}`,
                fieldName: null,
                oldValue: row.projectId,
                newValue: null,
                changeType: 'DELETE',
                changedBy: currentUser(req),
                changedOn: now()
            }));
 
            await INSERT.into(ChangeLogs).entries(logEntries);
        }
 
        return true;
    });
};