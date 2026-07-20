sap.ui.define([
    "sap/m/MessageToast"
], function(MessageToast) {
    'use strict';

    return {
        onOkProjects: function(oEvent) {
            //assign projects against the partner
            debugger;
            var oController = this._controller;
            var oModel = oController.getView().getModel();
            var aSelectedProjects = oEvent.getSource().getBinding("items").getSelectedContexts();
            var sPartnerId = oController.getView().getModel("projects").getProperty("/0/partnerId");

            this._oManageProjectsDialog.close();
            this._oManageProjectsDialog.destroy();
            this._oManageProjectsDialog = null;
        },
        onCancelDialog: function(oEvent) {
            this._oManageProjectsDialog.close();
            this._oManageProjectsDialog.destroy();
            this._oManageProjectsDialog = null;
        }
    }
});