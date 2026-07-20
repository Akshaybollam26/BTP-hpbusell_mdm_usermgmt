sap.ui.define([
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function(MessageToast, JSONModel) {
    'use strict';

    return {
        /**
         * Generated event handler.
         *
         * @param oEvent the event object provided by the event provider.
         */
        onPress: async function(oEvent) {
            var oController = this._controller;
            var oModel = oController.getView().getModel();
            var oUser = oEvent.getSource().getBindingContext().getObject();
            var sPartnerId = oUser.partnerId;
            try {
                const oOperation = oModel.bindContext(`/findSelectedProjects(...)` );
                oOperation.setParameter("partnerId", sPartnerId);
                await oOperation.execute();
                const aProjects = oOperation.getBoundContext().getObject().value;
                oController.getView().setModel(new JSONModel(aProjects), "projects");
            } catch (oError) {
                MessageToast.show("Unable to load projects");
                console.error(oError);
                return;
            }
            debugger;
            if (!this._oManageProjectsDialog) {
                this._oManageProjectsDialog = await this.loadFragment({
                    name: "hpbuysell.mdm.usermgmtui.ext.fragment.ManageProjectsDialog"
                });
            }
            this._oManageProjectsDialog.open();
        }
    };
});
