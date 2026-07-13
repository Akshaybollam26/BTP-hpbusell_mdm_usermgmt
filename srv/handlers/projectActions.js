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
     * addProjects bound action
     */

    srv.on('addProjects', PartnerAssignments, async (req) => {
        const partnerID =
            req.params?.[0]?.ID;

        const { projectIds } = req.data;

        if (
            !Array.isArray(projectIds) ||
            projectIds.length === 0
        ) {
            return [];
        }

        const partner = await SELECT.one
            .from(PartnerAssignments)
            .where({ ID: partnerID });

        if (!partner) {
            return req.reject(
                404,
                'Partner assignment not found'
            );
        }

        const uniqueProjectIds = [
            ...new Set(projectIds)
        ];

        /*
         * Validate projects exist and are active.
         */
        const activeProjects = await SELECT
            .from(ProjectMaster)
            .where({
                projectId: { in: uniqueProjectIds },
                status: 'A'
            });

        if (activeProjects.length !== uniqueProjectIds.length) {
            return req.reject(
                400,
                'One or more selected projects do not exist or are inactive'
            );
        }

        /*
         * Skip already assigned projects.
         */
        const existingAssignments = await SELECT
            .from(ProjectAssignments)
            .where({
                partner_ID: partnerID
            });

        const existingProjectIds = new Set(
            existingAssignments.map(row => row.projectId)
        );

        const projectsToInsert = activeProjects
            .filter(project => !existingProjectIds.has(project.projectId))
            .map(project => ({
                ID: cds.utils.uuid(),
                partner_ID: partnerID,
                projectId: project.projectId,
                projectName: project.projectName
            }));

        if (!projectsToInsert.length) {
            return [];
        }

        await INSERT
            .into(ProjectAssignments)
            .entries(projectsToInsert);

        /*
         * Change logs for added projects.
         */
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

        await INSERT
            .into(ChangeLogs)
            .entries(logEntries);

        return projectsToInsert;
    });


    /*
     * removeProjects bound action
     */

    srv.on('removeProjects', PartnerAssignments, async (req) => {
        const partnerID =
            req.params?.[0]?.ID;

        const { projectIds } = req.data;

        if (
            !Array.isArray(projectIds) ||
            projectIds.length === 0
        ) {
            return true;
        }

        const partner = await SELECT.one
            .from(PartnerAssignments)
            .where({ ID: partnerID });

        if (!partner) {
            return req.reject(
                404,
                'Partner assignment not found'
            );
        }

        const uniqueProjectIds = [
            ...new Set(projectIds)
        ];

        const assignmentsToDelete = await SELECT
            .from(ProjectAssignments)
            .where({
                partner_ID: partnerID,
                projectId: { in: uniqueProjectIds }
            });

        /*
         * Tolerate projects that are already missing.
         */
        if (!assignmentsToDelete.length) {
            return true;
        }

        await DELETE
            .from(ProjectAssignments)
            .where({
                ID: {
                    in: assignmentsToDelete.map(row => row.ID)
                }
            });

        /*
         * Change logs for removed projects.
         */
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

        await INSERT
            .into(ChangeLogs)
            .entries(logEntries);

        return true;
    });
};