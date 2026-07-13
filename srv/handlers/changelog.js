const cds = require('@sap/cds');

module.exports = (srv) => {
    const {
        Users,
        PartnerAssignments,
        ProjectAssignments,
        ChangeLogs
    } = srv.entities;

    function now() {
        return new Date().toISOString();
    }

    function currentUser(req) {
        return req.user?.id || 'anonymous';
    }

    function stringifyValue(value) {
        if (value === undefined || value === null) {
            return null;
        }

        if (typeof value === 'object') {
            return JSON.stringify(value);
        }

        return String(value);
    }

    function buildFieldLogs({
        userEmail,
        objectType,
        objectKey,
        existing,
        incoming,
        changeType,
        req,
        allowedFields
    }) {
        const logs = [];

        for (const field of allowedFields) {
            if (!(field in incoming)) {
                continue;
            }

            const oldValue =
                existing ? existing[field] : null;

            const newValue =
                incoming[field];

            if (oldValue !== newValue) {
                logs.push({
                    ID: cds.utils.uuid(),
                    user_email: userEmail,
                    objectType,
                    objectKey,
                    fieldName: field,
                    oldValue: stringifyValue(oldValue),
                    newValue: stringifyValue(newValue),
                    changeType,
                    changedBy: currentUser(req),
                    changedOn: now()
                });
            }
        }

        return logs;
    }


    /*
     * USER CREATE CHANGE LOG
     */

    srv.after('CREATE', Users, async (data, req) => {
        await INSERT.into(ChangeLogs).entries({
            ID: cds.utils.uuid(),
            user_email: data.email,
            objectType: 'USER',
            objectKey: data.email,
            fieldName: null,
            oldValue: null,
            newValue: stringifyValue(data),
            changeType: 'CREATE',
            changedBy: currentUser(req),
            changedOn: now()
        });
    });


    /*
     * USER UPDATE CHANGE LOG
     * Only firstName and lastName are editable.
     */

    srv.before('UPDATE', Users, async (req) => {
        const email =
            req.data.email ||
            req.params?.[0]?.email;

        const existing = await SELECT.one
            .from(Users)
            .where({ email });

        if (!existing) {
            return;
        }

        const logs = buildFieldLogs({
            userEmail: existing.email,
            objectType: 'USER',
            objectKey: existing.email,
            existing,
            incoming: req.data,
            changeType: 'UPDATE',
            req,
            allowedFields: [
                'firstName',
                'lastName'
            ]
        });

        if (logs.length) {
            await INSERT.into(ChangeLogs).entries(logs);
        }
    });


    /*
     * USER DELETE CHANGE LOG
     */

    srv.before('DELETE', Users, async (req) => {
        const email =
            req.data.email ||
            req.params?.[0]?.email;

        const existing = await SELECT.one
            .from(Users)
            .where({ email });

        if (!existing) {
            return;
        }

        await INSERT.into(ChangeLogs).entries({
            ID: cds.utils.uuid(),
            user_email: existing.email,
            objectType: 'USER',
            objectKey: existing.email,
            fieldName: null,
            oldValue: stringifyValue(existing),
            newValue: null,
            changeType: 'DELETE',
            changedBy: currentUser(req),
            changedOn: now()
        });
    });


    /*
     * PARTNER CREATE CHANGE LOG
     */

    srv.after('CREATE', PartnerAssignments, async (data, req) => {
        const userEmail =
            data.user_email ||
            data.user?.email;

        await INSERT.into(ChangeLogs).entries({
            ID: cds.utils.uuid(),
            user_email: userEmail,
            objectType: 'PARTNER_ASSIGNMENT',
            objectKey: data.ID,
            fieldName: null,
            oldValue: null,
            newValue: stringifyValue(data),
            changeType: 'CREATE',
            changedBy: currentUser(req),
            changedOn: now()
        });
    });


    /*
     * PARTNER UPDATE CHANGE LOG
     */

    srv.before('UPDATE', PartnerAssignments, async (req) => {
        const ID =
            req.data.ID ||
            req.params?.[0]?.ID;

        const existing = await SELECT.one
            .from(PartnerAssignments)
            .where({ ID });

        if (!existing) {
            return;
        }

        const logs = buildFieldLogs({
            userEmail: existing.user_email,
            objectType: 'PARTNER_ASSIGNMENT',
            objectKey: existing.ID,
            existing,
            incoming: req.data,
            changeType: 'UPDATE',
            req,
            allowedFields: [
                'partnerType',
                'partnerId',
                'partnerName'
            ]
        });

        if (logs.length) {
            await INSERT.into(ChangeLogs).entries(logs);
        }
    });


    /*
     * PARTNER DELETE CHANGE LOG
     */

    srv.before('DELETE', PartnerAssignments, async (req) => {
        const ID =
            req.data.ID ||
            req.params?.[0]?.ID;

        const existing = await SELECT.one
            .from(PartnerAssignments)
            .where({ ID });

        if (!existing) {
            return;
        }

        await INSERT.into(ChangeLogs).entries({
            ID: cds.utils.uuid(),
            user_email: existing.user_email,
            objectType: 'PARTNER_ASSIGNMENT',
            objectKey: existing.ID,
            fieldName: null,
            oldValue: stringifyValue(existing),
            newValue: null,
            changeType: 'DELETE',
            changedBy: currentUser(req),
            changedOn: now()
        });
    });


    /*
     * PROJECT CREATE CHANGE LOG
     */

    srv.after('CREATE', ProjectAssignments, async (data, req) => {
        const partnerID =
            data.partner_ID ||
            data.partner?.ID;

        const partner = await SELECT.one
            .from(PartnerAssignments)
            .where({ ID: partnerID });

        await INSERT.into(ChangeLogs).entries({
            ID: cds.utils.uuid(),
            user_email: partner?.user_email,
            objectType: 'PROJECT_ASSIGNMENT',
            objectKey: data.ID,
            fieldName: null,
            oldValue: null,
            newValue: stringifyValue(data),
            changeType: 'CREATE',
            changedBy: currentUser(req),
            changedOn: now()
        });
    });


    /*
     * PROJECT UPDATE CHANGE LOG
     */

    srv.before('UPDATE', ProjectAssignments, async (req) => {
        const ID =
            req.data.ID ||
            req.params?.[0]?.ID;

        const existing = await SELECT.one
            .from(ProjectAssignments)
            .where({ ID });

        if (!existing) {
            return;
        }

        const partner = await SELECT.one
            .from(PartnerAssignments)
            .where({ ID: existing.partner_ID });

        const logs = buildFieldLogs({
            userEmail: partner?.user_email,
            objectType: 'PROJECT_ASSIGNMENT',
            objectKey: existing.ID,
            existing,
            incoming: req.data,
            changeType: 'UPDATE',
            req,
            allowedFields: [
                'projectId',
                'projectName'
            ]
        });

        if (logs.length) {
            await INSERT.into(ChangeLogs).entries(logs);
        }
    });


    /*
     * PROJECT DELETE CHANGE LOG
     */

    srv.before('DELETE', ProjectAssignments, async (req) => {
        const ID =
            req.data.ID ||
            req.params?.[0]?.ID;

        const existing = await SELECT.one
            .from(ProjectAssignments)
            .where({ ID });

        if (!existing) {
            return;
        }

        const partner = await SELECT.one
            .from(PartnerAssignments)
            .where({ ID: existing.partner_ID });

        await INSERT.into(ChangeLogs).entries({
            ID: cds.utils.uuid(),
            user_email: partner?.user_email,
            objectType: 'PROJECT_ASSIGNMENT',
            objectKey: existing.ID,
            fieldName: null,
            oldValue: stringifyValue(existing),
            newValue: null,
            changeType: 'DELETE',
            changedBy: currentUser(req),
            changedOn: now()
        });
    });
};