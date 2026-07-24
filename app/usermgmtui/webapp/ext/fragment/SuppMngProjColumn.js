sap.ui.define([
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
], function (MessageToast, JSONModel) {
    'use strict';
 
    return {
        /**
         * Generated event handler.
         *
         * @param oEvent the event object provided by the event provider.
         */
        onPress: async function (oEvent) {
            //read unassigned projects from the db and set model and display in dialog
            const oController = this._controller;
            const oModel = oController.getView().getModel();
            // const oContext = oEvent.getSource().getBindingContext();
            this._oPartnerAssignmentContext = oEvent.getSource().getBindingContext();
            const oPartner = this._oPartnerAssignmentContext.getObject();
            const sPartnerId = oPartner.partnerId;
            this._sPartnerUuid = oPartner.ID;
            const isActiveEntity = oPartner.IsActiveEntity !== false;

            debugger;
            // const sPath = oContext.getPath();
            // // /Users(email='ava.taylor%40hp.com',IsActiveEntity=false)/suppliers(...)
            // // const sUserPath = sPath.substring(0, sPath.indexOf("/suppliers"));
            // const sUserPath = oContext.getPath().replace(/\/(customers|suppliers)\(.*\)$/, "");
            // const oUserContext = oContext.getModel().bindContext(sUserPath);
            // await oUserContext.requestObject();
            // const sEmail = oUserContext.getObject().email;
            // const sUserEmail = oEvent.getSource().getBindingContext().getPath().match(/email='([^']+)'/)[1];

            try {
                const oOperation = oModel.bindContext(`/findSelectedProjects(...)`);
                oOperation.setParameter("partnerID", this._sPartnerUuid);
                oOperation.setParameter("isActiveEntity", isActiveEntity);
                await oOperation.execute();
                const aProjects = oOperation.getBoundContext().getObject().value;
                this._aInitialProjectsList = aProjects.map(project => ({ ...project }));
                oController.getView().setModel(new JSONModel(aProjects), "projects");
            } catch (oError) {
                MessageToast.show("Unable to load projects");
                console.error(oError);
                return;
            }
            if (!this._oManageProjectsDialog) {
                this._oManageProjectsDialog = await this.loadFragment({
                    name: "hpbuysell.mdm.usermgmtui.ext.fragment.ManageProjectsDialog"
                });
            }
            this._oManageProjectsDialog.open();
        },
        onOkProjects: async function (oEvent) {
            var oController = this._controller;
            var oModel = oController.getView().getModel();
 
            const aChangedProjectList = oController.getView().getModel("projects").oData;
            const aSelectedProjectsIds = aChangedProjectList.filter(p => p.selected === true).map(p => p.projectId);
            const aUnselectedProjectsIds = aChangedProjectList.filter(p => p.selected === false).map(p => p.projectId);
            const aInitialSelectedProjectIds = this._aInitialProjectsList.filter(p => p.selected === true).map(p => p.projectId);
 
            const aProjectsToAdd = aSelectedProjectsIds.filter(id => !aInitialSelectedProjectIds.includes(id));
            const aProjectsToRemove = aUnselectedProjectsIds.filter(id => aInitialSelectedProjectIds.includes(id));
 
            const isActiveEntity = this._oPartnerAssignmentContext.getObject().IsActiveEntity !== false;
            debugger;
            try {
                if (aProjectsToAdd.length) {
                    await oModel.bindContext("/addProjects(...)")
                        .setParameter("partnerID", this._sPartnerUuid)
                        .setParameter("isActiveEntity", isActiveEntity)
                        .setParameter("projectIds", aProjectsToAdd)
                        .execute();
 
                    await this._oPartnerAssignmentContext.requestSideEffects([{ $NavigationPropertyPath: "projects" }]);
                }
                if (aProjectsToRemove.length) {
                    await oModel.bindContext("/removeProjects(...)")
                        .setParameter("partnerID", this._sPartnerUuid)
                        .setParameter("isActiveEntity", isActiveEntity)
                        .setParameter("projectIds", aProjectsToRemove)
                        .execute();
 
                    await this._oPartnerAssignmentContext.requestSideEffects([{ $NavigationPropertyPath: "projects" }]);
                }
                MessageToast.show("Projects updated successfully");
            } catch (oError) {
                MessageToast.show("Unable to update projects");
                console.error(oError);
                return;
            }
 
            this._oManageProjectsDialog.close();
            this._oManageProjectsDialog.destroy();
            this._oManageProjectsDialog = null;
        },
        onCancelDialog: function (oEvent) {
            this._oManageProjectsDialog.close();
            this._oManageProjectsDialog.destroy();
            this._oManageProjectsDialog = null;
        }
    };
});