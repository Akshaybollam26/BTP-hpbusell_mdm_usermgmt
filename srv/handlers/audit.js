module.exports = (srv) => {
    const { Users } = srv.entities;

    /*
     * Audit Fields on Create
     */

    srv.before('CREATE', Users, async (req) => {
        const now = new Date().toISOString();
        const userId = req.user?.id || 'anonymous';

        req.data.createdBy = userId;
        req.data.createdOn = now;
        req.data.changedBy = userId;
        req.data.changedOn = now;
    });


    /*
     * Audit Fields on Update
     */

    srv.before('UPDATE', Users, async (req) => {
        const now = new Date().toISOString();
        const userId = req.user?.id || 'anonymous';

        req.data.changedBy = userId;
        req.data.changedOn = now;
    });
};