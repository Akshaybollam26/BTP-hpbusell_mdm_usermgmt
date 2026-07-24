module.exports = (srv) => {
    const { auth } = srv.entities;
    srv.on("READ", "auth", async (req) => {

        console.log("User:", req.user.id);
        console.log("Roles:", req.user.roles);

        console.log("Viewer :", req.user.is("UsermgmtViewer"));
        console.log("Manage :", req.user.is("UsermgmtManage"));

        const isViewer = req.user.is("UsermgmtViewer");
        const isManage = req.user.is("UsermgmtManage");

        req.reply({
            ID: "AUTH",
            canCreate: isManage,
            canUpdate: isManage,
            canDelete: isManage
        });
    });
}   