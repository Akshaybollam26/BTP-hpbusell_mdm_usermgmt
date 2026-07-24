module.exports = (srv) => {
    const { Users, ChangeLogs } = srv.entities;
 
    function now() {
        return new Date().toISOString();
    }
 
    function currentUser(req) {
        return req.user?.id || 'anonymous';
    }
 
    function str(value) {
        if (value === undefined || value === null) return null;
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
 
    function pushLog(entries, { userEmail, objectType, objectKey, fieldName = null, oldValue = null, newValue = null, changeType, req }) {
        entries.push({
            ID: cds.utils.uuid(),
            user_email: userEmail,
            objectType,
            objectKey,
            fieldName,
            oldValue: str(oldValue),
            newValue: str(newValue),
            changeType,
            changedBy: currentUser(req),
            changedOn: now()
        });
    }
 
    async function safeInsert(entries) {
        if (!entries.length) return;
        try {
            await INSERT.into(ChangeLogs).entries(entries);
        } catch (err) {
            console.error('[changelog] failed to write ChangeLogs entries:', err.message);
        }
    }
 
 
    /*
     * Snapshot the ACTIVE (already-persisted) state of the user tree
     * before the draft gets activated and overwrites it. If no active
     * row exists yet, this is a brand-new user (CREATE).
     */
    srv.before('SAVE', Users, async (req) => {
        const email = req.params?.[0]?.email || req.data?.email;
        if (!email) {
            req._preSave = null;
            return;
        }
 
        const existing = await SELECT.one.from(Users)
            .columns(u => {
                u.email, u.firstName, u.lastName,
                u.customers(c => {
                    c.ID, c.partnerType, c.partnerId, c.partnerName,
                    c.projects(p => { p.ID, p.projectId, p.projectName });
                }),
                u.suppliers(s => {
                    s.ID, s.partnerType, s.partnerId, s.partnerName,
                    s.projects(p => { p.ID, p.projectId, p.projectName });
                });
            })
            .where({ email });
 
        req._preSave = existing || null;
    });
 
 
    /*
     * Diff the fully-resolved final data against the pre-save snapshot
     * and write one ChangeLogs row per changed/created/deleted field.
     */
    srv.after('SAVE', Users, async (data, req) => {
        const before = req._preSave;
        const userEmail = data.email;
        const entries = [];
 
        if (!before) {
            // brand new user
            pushLog(entries, { userEmail, objectType: 'USER', objectKey: userEmail, fieldName: 'email', newValue: data.email, changeType: 'CREATE', req });
            pushLog(entries, { userEmail, objectType: 'USER', objectKey: userEmail, fieldName: 'firstName', newValue: data.firstName, changeType: 'CREATE', req });
            pushLog(entries, { userEmail, objectType: 'USER', objectKey: userEmail, fieldName: 'lastName', newValue: data.lastName, changeType: 'CREATE', req });
 
            for (const partner of [...(data.customers || []), ...(data.suppliers || [])]) {
                logPartnerCreate(entries, userEmail, partner, req);
            }
        } else {
            // existing user - diff top-level fields
            for (const field of ['firstName', 'lastName']) {
                if (before[field] !== data[field]) {
                    pushLog(entries, {
                        userEmail, objectType: 'USER', objectKey: userEmail, fieldName: field,
                        oldValue: before[field], newValue: data[field], changeType: 'UPDATE', req
                    });
                }
            }
 
            diffPartnerList(before.customers || [], data.customers || [], entries, userEmail, req);
            diffPartnerList(before.suppliers || [], data.suppliers || [], entries, userEmail, req);
        }
 
        await safeInsert(entries);
    });
 
 
    function logPartnerCreate(entries, userEmail, partner, req) {
        pushLog(entries, { userEmail, objectType: 'PARTNER_ASSIGNMENT', objectKey: partner.ID, fieldName: 'partnerType', newValue: partner.partnerType, changeType: 'CREATE', req });
        pushLog(entries, { userEmail, objectType: 'PARTNER_ASSIGNMENT', objectKey: partner.ID, fieldName: 'partnerId', newValue: partner.partnerId, changeType: 'CREATE', req });
        if (partner.partnerName) {
            pushLog(entries, { userEmail, objectType: 'PARTNER_ASSIGNMENT', objectKey: partner.ID, fieldName: 'partnerName', newValue: partner.partnerName, changeType: 'CREATE', req });
        }
        for (const proj of (partner.projects || [])) {
            pushLog(entries, {
                userEmail, objectType: 'PROJECT_ASSIGNMENT', objectKey: `${partner.ID}/${proj.projectId}`,
                fieldName: 'projectId', newValue: proj.projectId, changeType: 'CREATE', req
            });
        }
    }
 
    function diffPartnerList(beforeList, afterList, entries, userEmail, req) {
        const beforeMap = new Map(beforeList.map(p => [p.ID, p]));
        const afterMap = new Map(afterList.map(p => [p.ID, p]));
 
        // created rows
        for (const [id, partner] of afterMap) {
            if (!beforeMap.has(id)) {
                logPartnerCreate(entries, userEmail, partner, req);
            }
        }
 
        // deleted rows
        for (const [id, partner] of beforeMap) {
            if (!afterMap.has(id)) {
                pushLog(entries, {
                    userEmail, objectType: 'PARTNER_ASSIGNMENT', objectKey: id,
                    oldValue: partner, changeType: 'DELETE', req
                });
            }
        }
 
        // updated rows + nested project diff
        for (const [id, partner] of afterMap) {
            const prev = beforeMap.get(id);
            if (!prev) continue;
 
            for (const field of ['partnerId', 'partnerName']) {
                if (prev[field] !== partner[field]) {
                    pushLog(entries, {
                        userEmail, objectType: 'PARTNER_ASSIGNMENT', objectKey: id, fieldName: field,
                        oldValue: prev[field], newValue: partner[field], changeType: 'UPDATE', req
                    });
                }
            }
 
            diffProjectList(prev.projects || [], partner.projects || [], entries, userEmail, id, req);
        }
    }
 
    function diffProjectList(beforeList, afterList, entries, userEmail, partnerID, req) {
        const beforeMap = new Map(beforeList.map(p => [p.ID, p]));
        const afterMap = new Map(afterList.map(p => [p.ID, p]));
 
        for (const [id, proj] of afterMap) {
            if (!beforeMap.has(id)) {
                pushLog(entries, {
                    userEmail, objectType: 'PROJECT_ASSIGNMENT', objectKey: `${partnerID}/${proj.projectId}`,
                    fieldName: 'projectId', newValue: proj.projectId, changeType: 'CREATE', req
                });
            }
        }
 
        for (const [id, proj] of beforeMap) {
            if (!afterMap.has(id)) {
                pushLog(entries, {
                    userEmail, objectType: 'PROJECT_ASSIGNMENT', objectKey: `${partnerID}/${proj.projectId}`,
                    oldValue: proj, changeType: 'DELETE', req
                });
            }
        }
    }
 
 
    /*
     * Deleting a Users row is a root-level operation, not subject to
     * "via root only" - plain DELETE works fine here.
     */
    srv.before('DELETE', Users, async (req) => {
        const email = req.data?.email || req.params?.[0]?.email;
 
        const existing = await SELECT.one.from(Users).where({ email });
        if (!existing) return;
 
        await safeInsert([{
            ID: cds.utils.uuid(),
            user_email: existing.email,
            objectType: 'USER',
            objectKey: existing.email,
            fieldName: null,
            oldValue: str(existing),
            newValue: null,
            changeType: 'DELETE',
            changedBy: currentUser(req),
            changedOn: now()
        }]);
    });
};