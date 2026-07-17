module.exports = (srv) => {
    const {
        Users,
        PartnerAssignments,
        ProjectAssignments
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