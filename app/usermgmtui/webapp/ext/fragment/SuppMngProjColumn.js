sap.ui.define([
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
], function(MessageToast, JSONModel) {
    'use strict';

    return {
        /**
         * Generated event handler.
         *
         * @param oEvent the event object provided by the event provider.
         */
        onPress: async function(oEvent) {
            //read unassigned projects from the db and set model and display in dialog
            var oController = this._controller;
            var oModel = oController.getView().getModel();
            var oUser = oEvent.getSource().getBindingContext().getObject();
            var sPartnerId = oUser.partnerId;
            this._sPartnerUuid = oUser.ID;
            try {
                const oOperation = oModel.bindContext(`/findSelectedProjects(...)` );
                oOperation.setParameter("partnerId", sPartnerId);
                await oOperation.execute();
                const aProjects = oOperation.getBoundContext().getObject().value;
                this._aInitialProjectsList = aProjects.map(project => ({ ...project }));
                debugger;
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
        onOkProjects: async function(oEvent) {
            //assign projects against the partner
            debugger;
            var oController = this._controller;
            var oModel = oController.getView().getModel();

            const aChangedProjectList = oController.getView().getModel("projects").oData;
            const aSelectedProjectsIds = aChangedProjectList.filter(project => project.selected === true).map(project => project.projectId);
            const aUnselectedProjectsIds = aChangedProjectList.filter(project => project.selected === false).map(project => project.projectId);
            const aInitialSelectedProjectIds = this._aInitialProjectsList.filter(project => project.selected === true).map(project => project.projectId);

            // Projects newly selected (to INSERT)
            const aProjectsToAdd = aSelectedProjectsIds.filter(projectId => !aInitialSelectedProjectIds.includes(projectId));
            // Projects newly unselected (to DELETE)
            const aProjectsToRemove = aUnselectedProjectsIds.filter(projectId => aInitialSelectedProjectIds.includes(projectId));
            try{
                if(aProjectsToAdd.length) {
                    await oModel.bindContext(`/PartnerAssignments(${this._sPartnerUuid}, IsActiveEntity=true)/UserManagementService.addProjects(...)`).setParameter("projectIds", aProjectsToAdd).execute();
                }
                if(aProjectsToRemove.length) {
                    await oModel.bindContext(`/PartnerAssignments(${this._sPartnerUuid}, IsActiveEntity=true)/UserManagementService.removeProjects(...)`).setParameter("projectIds", aProjectsToRemove).execute();
                }
                new MessageToast.show("Projects updated successfully");
                oModel.refresh();
            }catch(oError){
                MessageToast.show("Unable to update projects");
                console.error(oError);
                return;
            }
            this._oManageProjectsDialog.close();
            this._oManageProjectsDialog.destroy();
            this._oManageProjectsDialog = null;
        },
        onCancelDialog: function(oEvent) {
            this._oManageProjectsDialog.close();
            this._oManageProjectsDialog.destroy();
            this._oManageProjectsDialog = null;
        }
    };
});
