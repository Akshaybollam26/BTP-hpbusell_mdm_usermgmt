module.exports = (srv) => {
    const {
        Users,
        PartnerAssignments,
        ProjectAssignments,
        ProjectMaster,
        BusinessPartnerVH
    } = srv.entities;


    // srv.before("PATCH", PartnerAssignments.drafts, async (req) => {

    //     const { partnerId } = req.data;

    //     if (!partnerId) {
    //         return;
    //     }

    //     const draftRows = await SELECT.from(PartnerAssignments.drafts)
    //         .columns("ID", "partnerId");

    //     const duplicate = draftRows.find(r =>
    //         r.partnerId === partnerId &&
    //         r.ID !== req.data.ID
    //     );

    //     if (duplicate) {
    //         req.reject(400, "Partner ID is already selected.");
    //     }

    // });

    /*
     * Intercepts the generated value help's READ on BusinessPartnerVH.
     * userEmail is a dummy column (always null in the DB) added purely
     * so it's a valid $filter target for the ValueListParameterIn -
     * the actual filtering logic below is entirely computed here, not
     * evaluated by the database.
     */
    srv.on('READ', BusinessPartnerVH, async (req, next) => {
        const whereArr = req.query.SELECT.where;
        console.log(JSON.stringify(req.query, null, 2));
 
        function extractEqValue(fieldName) {
            if (!Array.isArray(whereArr)) return undefined;
 
            for (let i = 0; i < whereArr.length; i++) {
                if (
                    whereArr[i]?.ref?.[0] === fieldName &&
                    whereArr[i + 1] === '=' &&
                    whereArr[i + 2]?.val !== undefined
                ) {
                    return whereArr[i + 2].val;
                }
            }
 
            return undefined;
        }
 
        function stripCondition(fieldName) {
            if (!Array.isArray(whereArr)) return;
            for (let i = 0; i < whereArr.length; i++) {
                if (whereArr[i]?.ref?.[0] === fieldName && whereArr[i + 1] === '=') {
                    const clauseStart = i > 0 && (whereArr[i - 1] === 'and' || whereArr[i - 1] === 'or') ? i - 1 : i;
                    const clauseEnd = whereArr[i + 3] === 'and' || whereArr[i + 3] === 'or' ? i + 3 : i + 2;
                    whereArr.splice(clauseStart, clauseEnd - clauseStart + 1);
                    return;
                }
            }
        }
 
        const rowID = extractEqValue('userEmail');
        let partnerType = extractEqValue('partnerType');
 
        console.log('[DEBUG BusinessPartnerVH READ] rowID:', rowID, '| partnerType:', partnerType);
 
        if (!rowID) {
            return next();
        }
 
        stripCondition('userEmail');
 
        const [draftRow, activeRow] = await Promise.all([
            SELECT.one.from(PartnerAssignments.drafts).where({ ID: rowID }),
            SELECT.one.from(PartnerAssignments).where({ ID: rowID })
        ]);
        const ownerRow = draftRow || activeRow;
 
        if (!ownerRow?.user_email) {
            return next();
        }
 
        const userEmail = ownerRow.user_email;
        if (!partnerType) partnerType = ownerRow.partnerType;
 
        const candidates = await next();
        const candidateList = Array.isArray(candidates) ? candidates : [candidates].filter(Boolean);
 
        // Check if draft data exists for this user
        const draftAssignments = await
        SELECT.from(PartnerAssignments.drafts)
            .columns('partnerId')
            .where(partnerType? { user_email: userEmail, partnerType} : { user_email: userEmail });
 
        let assignedIDs;
        if (draftAssignments.length > 0) {
            assignedIDs = new Set(draftAssignments.map(r => r.partnerId).filter(Boolean));
        }
        else {
            const activeAssignments = await SELECT.from(PartnerAssignments)
            .columns('partnerId').where(partnerType ? { user_email: userEmail, partnerType } : { user_email: userEmail});
 
            assignedIDs = new Set(
                activeAssignments.map(r => r.partnerId).filter(Boolean)
            );
        }
 
        return candidateList.filter(row => !assignedIDs.has(row.partnerId));
    });

    /*
     * searchUsers function
     * Searches:
     * - email
     * - firstName
     * - lastName
     * - partnerId
     * - partnerName
     * - projectId
     * - projectName
     */
    srv.on("READ", "Users", async (req, next) => {
        const sSearch = req.query.SELECT.search;
        if (!sSearch) {
            return next();
        }
        const val = sSearch[0].val
        const like = `%${val}%`;
        console.log(sSearch);
        /*
         * 1. Search direct user fields.
         */
        const directUsers = await SELECT
            .from(Users)
            .where`
                lower(email) like ${like}
                or lower(firstName) like ${like}
                or lower(lastName) like ${like}
            `;
        const resultEmails = new Set(
            directUsers.map(user => user.email)
        );
        /*
         * 2. Search partnerId and partnerName.
         */
        const matchingPartners = await SELECT
            .from(PartnerAssignments)
            .columns('user_email')
            .where`
                lower(partnerId) like ${like}
                or lower(partnerName) like ${like}
            `;
        for (const partner of matchingPartners) {
            if (partner.user_email) {
                resultEmails.add(partner.user_email);
            }
        }
        /*
         * 3. Search projectId and projectName.
         */
        const matchingProjects = await SELECT
            .from(ProjectAssignments)
            .columns('partner_ID')
            .where`
                lower(projectId) like ${like}
                or lower(projectName) like ${like}
            `;
        const partnerIDs = [
            ...new Set(
                matchingProjects
                    .map(project => project.partner_ID)
                    .filter(Boolean)
            )
        ];
        if (partnerIDs.length) {
            const projectPartners = await SELECT
                .from(PartnerAssignments)
                .columns('user_email')
                .where({
                    ID: {
                        in: partnerIDs
                    }
                });

            for (const partner of projectPartners) {
                if (partner.user_email) {
                    resultEmails.add(partner.user_email);
                }
            }
        }
        /*
         * Final user result.
         */
        const emails = [...resultEmails];
        if (!emails.length) {
            return [];
        }
        const result = SELECT
            .from(Users)
            .where({
                email: {
                    in: emails
                }
            });
        console.log(result);
        return result;
    });
    srv.on('getUnassignedCustomers', async (req) => {
        const userEmail = req.data?.userEmail || req.params?.[0]?.userEmail || '';
        if (!userEmail) {
            return [];
        }

        /*
         * Check BOTH the active table and its .drafts twin. Without the
         * drafts check, a customer added earlier in this same, still-
         * unsaved draft session would be invisible here and could be
         * picked again from the value help - producing a duplicate once
         * the draft is saved.
         */
        console.log("Drafts:", drafts);
        const [activeAssigned, draftAssigned] = await Promise.all([
            SELECT.from(PartnerAssignments)
                .columns('partnerId')
                .where({ user_email: userEmail, partnerType: 'C' }),
            SELECT.from(PartnerAssignments.drafts)
                .columns('partnerId')
                .where({ user_email: userEmail, partnerType: 'C' })
        ]);

        const assignedCustomerIDs = [
            ...new Set(
                [...activeAssigned, ...draftAssigned]
                    .map(c => c.partnerId)
                    .filter(Boolean)
            )
        ];

        if (!assignedCustomerIDs.length) {
            return SELECT.from('CustomerMaster')
                .where({ status: 'A' });
        }
        const unassignedCustomers = await SELECT
            .from('CustomerMaster')
            .where({
                customerId: { not: { in: assignedCustomerIDs } },
                status: 'A'
            });

        return unassignedCustomers;
    });
    srv.on('getUnassignedSuppliers', async (req) => {
        const userEmail = req.data?.userEmail || req.params?.[0]?.userEmail || '';
        if (!userEmail) {
            return [];
        }

        const [activeAssigned, draftAssigned] = await Promise.all([
            SELECT.from(PartnerAssignments)
                .columns('partnerId')
                .where({ user_email: userEmail, partnerType: 'S' }),
            SELECT.from(PartnerAssignments.drafts)
                .columns('partnerId')
                .where({ user_email: userEmail, partnerType: 'S' })
        ]);

        const assignedSupplierIDs = [
            ...new Set(
                [...activeAssigned, ...draftAssigned]
                    .map(s => s.partnerId)
                    .filter(Boolean)
            )
        ];

        if (!assignedSupplierIDs.length) {
            return SELECT.from('SupplierMaster').where({ status: 'A' });
        }
        const unassignedSuppliers = await SELECT
            .from('SupplierMaster')
            .where({
                supplierId: { not: { in: assignedSupplierIDs } },
                status: 'A'
            });

        return unassignedSuppliers;
    });
    srv.on('findSelectedProjects', async (req) => {
        const { partnerID, isActiveEntity } = req.data;
        const isActive = isActiveEntity !== false;

        console.log('[DEBUG findSelectedProjects] req.data:', req.data, '| partnerID:', partnerID, '| isActive:', isActive);

        if (!partnerID) {
            console.log('[DEBUG findSelectedProjects] partnerID missing - returning []');
            return [];
        }

        const ProjectTarget = isActive ? ProjectAssignments : ProjectAssignments.drafts;

        const assignedProjects = await SELECT
            .from(ProjectTarget)
            .columns('projectId')
            .where({ partner_ID: partnerID });

        const allProjects = await SELECT.from(ProjectMaster).where({ status: 'A' });

        console.log('[DEBUG findSelectedProjects] assignedProjects:', assignedProjects, '| allProjects count:', allProjects.length);

        const assignedProjectIDs = assignedProjects.map(p => p.projectId);
        return allProjects.map(project => ({
            ...project,
            selected: assignedProjectIDs.includes(project.projectId)
        }));
    });
    srv.on('searchUsers', async (req) => {
        const searchTerm =
            req.data?.searchTerm ||
            req.params?.[0]?.searchTerm ||
            '';

        const normalizedSearch =
            String(searchTerm).trim().toLowerCase();

        if (!normalizedSearch) {
            return SELECT.from(Users);
        }

        const like = `%${normalizedSearch}%`;

        /*
         * 1. Search direct user fields.
         */
        const directUsers = await SELECT
            .from(Users)
            .where`
                lower(email) like ${like}
                or lower(firstName) like ${like}
                or lower(lastName) like ${like}
            `;

        const resultEmails = new Set(
            directUsers.map(user => user.email)
        );


        /*
         * 2. Search partnerId.
         */
        const matchingPartners = await SELECT
            .from(PartnerAssignments)
            .columns('user_email')
            .where`
                lower(partnerId) like ${like}
            `;

        for (const partner of matchingPartners) {
            if (partner.user_email) {
                resultEmails.add(partner.user_email);
            }
        }


        /*
         * 3. Search projectId.
         */
        const matchingProjects = await SELECT
            .from(ProjectAssignments)
            .columns('partner_ID')
            .where`
                lower(projectId) like ${like}
            `;

        const partnerIDs = [
            ...new Set(
                matchingProjects
                    .map(project => project.partner_ID)
                    .filter(Boolean)
            )
        ];

        if (partnerIDs.length) {
            const projectPartners = await SELECT
                .from(PartnerAssignments)
                .columns('user_email')
                .where({
                    ID: {
                        in: partnerIDs
                    }
                });

            for (const partner of projectPartners) {
                if (partner.user_email) {
                    resultEmails.add(partner.user_email);
                }
            }
        }


        /*
         * Final user result.
         */
        const emails = [...resultEmails];

        if (!emails.length) {
            return [];
        }

        return SELECT
            .from(Users)
            .where({
                email: {
                    in: emails
                }
            });
    });
};