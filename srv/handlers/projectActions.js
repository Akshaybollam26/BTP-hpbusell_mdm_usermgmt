const cds = require('@sap/cds');
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const axios = require("axios");
const { SELECT, UPDATE } = require('@sap/cds/lib/ql/cds-ql');
module.exports = (srv) => {
    const {
        PartnerAssignments,
        ProjectAssignments,
        ProjectMaster,
        Users,
        UserGroups
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


    srv.on('syncusers', async (req) => {
        //1. fetch all users who belong to buysell group thru partial search
        //handle pagination
        const buysellcount = await executeHttpRequest(
            { destinationName: 'IAS_SCIM' },
            {
                method: 'GET',
                url: `/scim/Users?filter=groups.display co "BuySell"&count=1`,

                headers: {
                    Accept: 'application/scim+json'
                }
            }
        );
        const grpcount = buysellcount.data.totalResults;
        // const grpcount = 1;
        console.log("grp count", grpcount);
        const buysellgrps = await executeHttpRequest(
            { destinationName: 'IAS_SCIM' },
            {
                method: 'GET',
                url: `/scim/Users?filter=groups.display co "BuySell"&count=${grpcount}`,
                //url: `/scim/Users?count=250`,
                headers: {
                    Accept: 'application/scim+json'
                }
            }
        );
        // 2. construct a users payload for further operations

        const usersinfo = buysellgrps.data.Resources.map(user => {

            const groups = (user.groups || []).map(group => ({
                groupId: group.value,
                groupName: group.display
            }));

            const hasCustomer = groups.some(g =>
                g.groupName.toLowerCase().includes("customer")
            );

            const hasSupplier = groups.some(g =>
                g.groupName.toLowerCase().includes("supplier")
            );

            let partnerType = "HP";

            if (hasCustomer && hasSupplier) {
                partnerType = "SC";
            } else if (hasCustomer) {
                partnerType = "C";
            } else if (hasSupplier) {
                partnerType = "S";
            }

            return {
                email: user.emails?.find(e => e.primary)?.value
                    ?? user.emails?.[0]?.value,

                firstName: user.name?.givenName,
                lastName: user.name?.familyName,
                active: user.active,
                displayName: user.displayName,
                userName: user.userName,
                locale: user.locale,
                preferredLanguage: user.preferredLanguage,
                timeZone: user.timeZone,

                UserGroupIndicator: partnerType,

                groups
            };
        });
        // 3. go by one by one user , 

        const existingUsers = await SELECT.from(Users); //fetching all users
        const existingUsersMap = new Map(
            existingUsers.map(user => [user.email, user])
        );
        const allGroups = await SELECT.from(UserGroups);
        const groupsByUser = new Map();

        for (const group of allGroups) {
            const email = group.user_email;

            if (!groupsByUser.has(email)) {
                groupsByUser.set(email, []);
            }

            groupsByUser.get(email).push(group);
        }

        for (const user of usersinfo) {
            //1. if that user is not available in our DB , create a new user along with their usergroups
            const existingUser = existingUsersMap.get(user.email);
            if (!existingUser) {

                await INSERT.into(Users).entries(user);
                continue;
            }
            // 2. if that user is already there :
            //a. 1. check if the userinfo is updated or not , for users , only active status , first name , last name are modifiable. if no changes don't make update call to that particular user
            const userChanged =
                existingUser.active !== user.active ||
                existingUser.firstName !== user.firstName ||
                existingUser.lastName !== user.lastName ||
                existingUser.UserGroupIndicator !== user.UserGroupIndicator;

            if (userChanged) {
                //update the users. 
                await UPDATE(Users).set({
                    active: user.active,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    UserGroupIndicator: user.UserGroupIndicator
                }).where({ email: user.email });

            }
            if (!user.active) {

                await DELETE.from(UserGroups)
                    .where({
                        user_email: user.email
                    });
                await DELETE.from(PartnerAssignments)
                    .where({ user_email: user.email });
                continue;
            }
            //DB groups
            const existingGroups = groupsByUser.get(user.email) || [];
            const dbGroupMap = new Map(
                existingGroups.map(g => [g.groupId, g.groupName])
            );
            const scimGroupMap = new Map(
                (user.groups || []).map(g => [g.groupId, g.groupName])
            );

            for (const [groupId, scimGroup] of scimGroupMap) {

                const dbGroup = dbGroupMap.get(groupId);

                // New group
                if (!dbGroup) {

                    await INSERT.into(UserGroups).entries({
                        user: {
                            email: user.email
                        },
                        groupId: groupId,
                        groupName: scimGroup
                    });

                    continue;
                }

                // Group name changed
                if (dbGroup !== scimGroup) {

                    await UPDATE(UserGroups)
                        .set({
                            groupName: scimGroup
                        })
                        .where({
                            user_email: user.email,
                            groupId: groupId
                        });
                }
            }
            for (const [groupId] of dbGroupMap) {

                if (!scimGroupMap.has(groupId)) {

                    await DELETE.from(UserGroups)
                        .where({
                            user_email: user.email,
                            groupId: groupId
                        });
                }
            }
        }

        const scimEmails = new Set(
            usersinfo.map(user => user.email)
        );

        for (const dbUser of existingUsers) {

            if (!scimEmails.has(dbUser.email) && dbUser.active) {

                await UPDATE(Users)
                    .set({
                        active: false,
                        UserGroupIndicator: ''
                    })
                    .where({
                        email: dbUser.email
                    });

                await DELETE.from(UserGroups)
                    .where({
                        user_email: dbUser.email
                    });
                await DELETE.from(PartnerAssignments)
                    .where({ user_email: dbUser.email });
            }
        }
    })


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
    srv.on('deactivateUser', async (req) => {
        const useremail = req.params[0].email;
        await UPDATE(Users).set({
            active: false,
            UserGroupIndicator: ''
        }).where({ email: useremail });

        await DELETE.from(UserGroups).where({ user_email: useremail })
        await DELETE.from(PartnerAssignments)
            .where({ user_email: useremail });


    })

};