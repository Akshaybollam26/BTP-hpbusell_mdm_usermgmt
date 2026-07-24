module.exports = (srv) => {
    const {
        Users,
        PartnerAssignments,
        ProjectAssignments,
        ProjectMaster
    } = srv.entities;

    /*
     * searchUsers function
     * Searches:
     * - email
     * - firstName
     * - lastName
     * - partnerId
     * - projectId
     */
    srv.on('getUnassignedCustomers', async (req) => {
        const userEmail = req.data?.userEmail || req.params?.[0]?.userEmail || '';
        if (!userEmail) {
            return [];
        }
        const assignedCustomers = await SELECT
            .from(PartnerAssignments)
            .columns('partnerId')
            .where({
                user_email: userEmail
            });
        const assignedCustomerIDs = assignedCustomers.map(c => c.partnerId);
        if(!assignedCustomerIDs.length) {
            return SELECT.from('CustomerMaster')
            .where({status: 'A'});
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
        const assignedSuppliers = await SELECT
            .from(PartnerAssignments)
            .columns('partnerId')
            .where({
                user_email: userEmail
            });
        const assignedSupplierIDs = assignedSuppliers.map(s => s.partnerId);
        if(!assignedSupplierIDs.length) {
            return SELECT.from('SupplierMaster').where({status: 'A'});
        }
        const unassignedSuppliers = await SELECT
            .from('SupplierMaster')
            .where({
                supplierId: { not: { in: assignedSupplierIDs } },
                status: 'A'
            });

        return unassignedSuppliers;
    });
    //send user email also
    srv.on('findSelectedProjects', async (req) => {
        // const partnerId = req.data?.partnerId || req.params?.[0]?.partnerId || '';
        // const userEmail = req.data?.userEmail || req.params?.[0]?.userEmail || '';
        // if (!partnerId) {
        //     return [];
        // }
        // if(!userEmail) return [];

        // //search for UID based on partner id and user email combo
        // const partnerRecord = await SELECT
        //     .from(PartnerAssignments.drafts)
        //     .columns('ID')
        //     .where({
        //         user_email: userEmail,
        //         partnerId: partnerId,
        //     });
        // const cuidForSelectedPartner = partnerRecord[0]?.ID;
        // const rows = await SELECT.from(PartnerAssignments.drafts);
        // console.log(rows);
        // //search based on partner id
        // const assignedProjects = await SELECT
        //     .from(ProjectAssignments.drafts)
        //     .columns('projectId')
        //     .where({
        //         partner_ID: cuidForSelectedPartner
        //     });
        // console.log('assignedProjects:', assignedProjects);
        // const assignedProjectIDs = assignedProjects.map(p => p.projectId);
        // // if(!assignedProjectIDs.length) {
        // //     return SELECT.from('ProjectMaster').where({status: 'A'});
        // // }
        // // const unassignedProjects = await SELECT
        // //     .from('ProjectMaster')
        // //     .where({
        // //         projectId: { not: { in: assignedProjectIDs } },
        // //         status: 'A'
        // //     });
        // // console.log('unassignedProjects:', unassignedProjects);
        // const allProjects = await SELECT
        //     .from('ProjectMaster')
        //     .where({ status: 'A' });

        // const result = allProjects.map(project => ({
        //     ...project,
        //     selected: assignedProjectIDs.includes(project.projectId)
        // }));
        // return result;



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