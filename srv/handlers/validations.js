module.exports = (srv) => {
    const {
        Users,
        PartnerAssignments,
        ProjectAssignments,
        CustomerMaster,
        SupplierMaster,
        ProjectMaster
    } = srv.entities;

    /*
     * USER VALIDATIONS
     * No mandatory validations here.
     * firstName / lastName are handled by @mandatory.
     * email is key, so mandatory is handled by CDS/key behavior.
     */

    srv.before('CREATE', Users, async (req) => {
        const { email } = req.data;

        /*
         * Email regex validation only.
         * Do not write email mandatory validation here.
         */
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(email)) {
                return req.reject(400, 'Invalid email format');
            }
        }

        /*
         * Email uniqueness validation.
         * Email is key, but this gives controlled business error.
         */
        if (email) {
            const existingUser = await SELECT.one
                .from(Users)
                .where({ email });

            if (existingUser) {
                return req.reject(400, 'Duplicate email');
            }
        }
    });


    srv.before('UPDATE', Users, async (req) => {
        const email =
            req.data.email ||
            req.params?.[0]?.email;

        const existing = await SELECT.one
            .from(Users)
            .where({ email });

        if (!existing) {
            return req.reject(404, `User ${email} not found`);
        }

        /*
         * According to TDS, only firstName and lastName can be changed.
         * Audit fields must not be manually updated by API/UI.
         */
        const nonEditableFields = [
            'createdBy',
            'createdOn',
            'changedBy',
            'changedOn'
        ];

        for (const field of nonEditableFields) {
            if (
                field in req.data &&
                req.data[field] !== existing[field]
            ) {
                return req.reject(
                    400,
                    `Field '${field}' cannot be modified`
                );
            }
        }
    });


    /*
     * PARTNER ASSIGNMENT VALIDATIONS
     * No mandatory checks for partnerType / partnerId.
     * They are already handled by @mandatory in schema.
     */

    srv.before(['CREATE', 'UPDATE'], PartnerAssignments, async (req) => {
        const { partnerType, partnerId } = req.data;

        /*
         * partnerType business validation.
         * If your enum works in CDS, this is still safe backend protection.
         */
        if (
            partnerType &&
            !['C', 'S'].includes(partnerType)
        ) {
            return req.reject(
                400,
                'Partner Type must be C or S'
            );
        }

        /*
         * For UPDATE, load existing values if not provided in payload.
         */
        let existingAssignment = null;

        if (req.event === 'UPDATE') {
            const ID =
                req.data.ID ||
                req.params?.[0]?.ID;

            existingAssignment = await SELECT.one
                .from(PartnerAssignments)
                .where({ ID });

            if (!existingAssignment) {
                return req.reject(
                    404,
                    'Partner assignment not found'
                );
            }
        }

        const finalPartnerType =
            partnerType ||
            existingAssignment?.partnerType;

        const finalPartnerId =
            partnerId ||
            existingAssignment?.partnerId;

        /*
         * Validate Customer/Supplier against active master data.
         * Also auto-populate partnerName from master data.
         */
        if (finalPartnerType === 'C' && finalPartnerId) {
            const customer = await SELECT.one
                .from(CustomerMaster)
                .where({
                    customerId: finalPartnerId,
                    status: 'A'
                });

            if (!customer) {
                return req.reject(
                    400,
                    `Customer ID '${finalPartnerId}' does not exist in the master data or is inactive`
                );
            }

            req.data.partnerName = customer.customerName;
        }

        if (finalPartnerType === 'S' && finalPartnerId) {
            const supplier = await SELECT.one
                .from(SupplierMaster)
                .where({
                    supplierId: finalPartnerId,
                    status: 'A'
                });

            if (!supplier) {
                return req.reject(
                    400,
                    `Supplier ID '${finalPartnerId}' does not exist in the master data or is inactive`
                );
            }

            req.data.partnerName = supplier.supplierName;
        }

        /*
         * Duplicate validation:
         * Same user cannot have same Customer/Supplier ID twice.
         */
        if (req.event === 'CREATE') {
            const userEmail =
                req.data.user_email ||
                req.data.user?.email;

            if (
                userEmail &&
                finalPartnerType &&
                finalPartnerId
            ) {
                const duplicate = await SELECT.one
                    .from(PartnerAssignments)
                    .where({
                        user_email: userEmail,
                        partnerType: finalPartnerType,
                        partnerId: finalPartnerId
                    });

                if (duplicate) {
                    return req.reject(
                        400,
                        'Duplicate Customer/Supplier ID for user'
                    );
                }
            }
        }

        if (req.event === 'UPDATE') {
            const ID =
                req.data.ID ||
                req.params?.[0]?.ID;

            const userEmail =
                req.data.user_email ||
                existingAssignment?.user_email;

            if (
                userEmail &&
                finalPartnerType &&
                finalPartnerId
            ) {
                const duplicate = await SELECT.one
                    .from(PartnerAssignments)
                    .where({
                        user_email: userEmail,
                        partnerType: finalPartnerType,
                        partnerId: finalPartnerId
                    });

                if (
                    duplicate &&
                    duplicate.ID !== ID
                ) {
                    return req.reject(
                        400,
                        'Duplicate Customer/Supplier ID for user'
                    );
                }
            }
        }
    });


    /*
     * PROJECT ASSIGNMENT VALIDATIONS
     * No mandatory check for projectId.
     * It is already handled by @mandatory in schema.
     */

    srv.before(['CREATE', 'UPDATE'], ProjectAssignments, async (req) => {
        const { projectId } = req.data;

        let existingAssignment = null;

        if (req.event === 'UPDATE') {
            const ID =
                req.data.ID ||
                req.params?.[0]?.ID;

            existingAssignment = await SELECT.one
                .from(ProjectAssignments)
                .where({ ID });

            if (!existingAssignment) {
                return req.reject(
                    404,
                    'Project assignment not found'
                );
            }
        }

        const finalProjectId =
            projectId ||
            existingAssignment?.projectId;

        /*
         * Validate project exists and is active.
         * Auto-populate projectName from ProjectMaster.
         */
        if (finalProjectId) {
            const project = await SELECT.one
                .from(ProjectMaster)
                .where({
                    projectId: finalProjectId,
                    status: 'A'
                });

            if (!project) {
                return req.reject(
                    400,
                    `Project ID '${finalProjectId}' does not exist or is inactive`
                );
            }

            req.data.projectName = project.projectName;
        }

        /*
         * Duplicate validation:
         * Same project cannot be assigned twice under same partner assignment.
         */
        if (req.event === 'CREATE') {
            const partnerID =
                req.data.partner_ID ||
                req.data.partner?.ID;

            if (
                partnerID &&
                finalProjectId
            ) {
                const duplicate = await SELECT.one
                    .from(ProjectAssignments)
                    .where({
                        partner_ID: partnerID,
                        projectId: finalProjectId
                    });

                if (duplicate) {
                    return req.reject(
                        400,
                        'Duplicate project for this Customer/Supplier assignment'
                    );
                }
            }
        }

        if (req.event === 'UPDATE') {
            const ID =
                req.data.ID ||
                req.params?.[0]?.ID;

            const partnerID =
                req.data.partner_ID ||
                existingAssignment?.partner_ID;

            if (
                partnerID &&
                finalProjectId
            ) {
                const duplicate = await SELECT.one
                    .from(ProjectAssignments)
                    .where({
                        partner_ID: partnerID,
                        projectId: finalProjectId
                    });

                if (
                    duplicate &&
                    duplicate.ID !== ID
                ) {
                    return req.reject(
                        400,
                        'Duplicate project for this Customer/Supplier assignment'
                    );
                }
            }
        }
    });
};