const cds = require('@sap/cds');

module.exports = (srv) => {
    const {
        PartnerAssignments,
        ProjectAssignments,
        ProjectMaster
    } = srv.entities;

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
     * passes partnerID and isActiveEntity explicitly as parameters, and
     * dispatch happens purely by action name at the service root - no
     * entity-target resolution, so no navigation-path sensitivity.
     *
     * NOTE: no ChangeLogs writes happen here anymore. All edits go
     * through the UI's draft flow (IsActiveEntity=false while editing,
     * activated on Save), so every project add/remove is picked up
     * automatically by the before/after('SAVE', Users) diff logic in
     * changelog.js once the draft is activated. Keeping logging in one
     * place only avoids double-logging and drift between the two files.
     */

    srv.on('addProjects', async (req) => {
        const { partnerID, isActiveEntity, projectIds } = req.data;
        const isActive = isActiveEntity !== false;

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

        return true;
    });


    /*
     * Draft-aware: reads whichever table (active or .drafts) matches the
     * row currently being edited, so re-opening the dialog mid-draft
     * correctly reflects projects already added/removed in this session
     * but not yet saved.
     */
    srv.on('findSelectedProjects', async (req) => {
        const { partnerID, isActiveEntity } = req.data;
        const isActive = isActiveEntity !== false;

        if (!partnerID) {
            return [];
        }

        const ProjectTarget = isActive ? ProjectAssignments : ProjectAssignments.drafts;

        const assignedProjects = await SELECT
            .from(ProjectTarget)
            .columns('projectId')
            .where({ partner_ID: partnerID });

        const assignedProjectIDs = assignedProjects.map(p => p.projectId);

        const allProjects = await SELECT
            .from(ProjectMaster)
            .where({ status: 'A' });

        return allProjects.map(project => ({
            ...project,
            selected: assignedProjectIDs.includes(project.projectId)
        }));
    });
};