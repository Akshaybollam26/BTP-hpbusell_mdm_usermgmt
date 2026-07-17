sap.ui.define([
    "sap/m/MessageToast",
    "sap/fe/templates/ObjectPage/ExtensionAPI",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment"
], function(MessageToast, ExtensionAPI, JSONModel, Fragment) {
    'use strict';
    
    return {
        /**
         * Generated event handler.
         *
         * @param oContext the context of the page on which the event was fired. `undefined` for list report page.
         * @param aSelectedContexts the selected contexts of the table rows.
         */
        onPressAddCustButton: async function(oContext, aSelectedContexts) {
            MessageToast.show("Custom handler invoked.");
            //read customer master here and set the model
            // this._helperFunction("/CustomerMaster");
            var oController = this._controller;
            var oModel = oController.getView().getModel();
            var oUser = oController.getView().getBindingContext().getObject();
            var sUserEmail = oUser.email;
            this._custAsstFlag = true;
            try {
                const oListBinding = oModel.bindList("/CustomerMaster");
                const aContexts = await oListBinding.requestContexts();

                const aCustomers = aContexts.map(function (oContext) {
                    return oContext.getObject();
                });
                const oJSONModel = new JSONModel(aCustomers);

                const oOperation = oModel.bindContext(`/getUnassignedCustomers(...)` );
                oOperation.setParameter("userEmail", sUserEmail);
                await oOperation.execute();
                const aCustomers2 = oOperation.getBoundContext().getObject().value;

                // Make model available to the fragment
                oController.getView().setModel(new JSONModel(aCustomers2), "partners");
            } catch (oError) {
                MessageToast.show("Unable to load customers");
                console.error(oError);
                return;
            }

            if (!this._oAddDialog) {
                this._oAddDialog = await this.loadFragment({
                    name: "hpbuysell.mdm.usermgmtui.ext.fragment.PartnerAssignment",
                });
                var oTable = this._oAddDialog.getContent()[0].getItems()[1];
                oTable.addColumn(new sap.m.Column({
                    header: new sap.m.Text({
                        text: "Customer ID"
                    })
                }));
                oTable.addColumn(new sap.m.Column({
                    header: new sap.m.Text({
                        text: "Customer Name"
                    })
                }));
                var oTemplate = new sap.m.ColumnListItem({
                    cells: [
                        new sap.m.Text({ text: "{partners>customerId}" }),
                        new sap.m.Text({ text: "{partners>customerName}" })
                    ]
                });
                oTable.bindItems({
                    path: "partners>/",
                    template: oTemplate
                });
                this._oAddDialog.setTitle("Select Customer ID");
                this._oAddDialog.open();
            }
            else this._oAddDialog.open();
        },
        onPressAddSuppButton: async function(oContext, aSelectedContexts) {
            MessageToast.show("Custom handler invoked.");
            // this._helperFunction("/SupplierMaster");
            var oController = this._controller;
            var oModel = oController.getView().getModel();
            var oUser = oController.getView().getBindingContext().getObject();
            var sUserEmail = oUser.email;
            this._suppAsstFlag = true;
            try {
                const oListBinding = oModel.bindList("/SupplierMaster");
                const aContexts = await oListBinding.requestContexts();
                const aSuppliers = aContexts.map(function (oContext) {
                    return oContext.getObject();
                });
                const oJSONModel = new JSONModel(aSuppliers);

                const oOperation = oModel.bindContext(`/getUnassignedSuppliers(...)` );
                oOperation.setParameter("userEmail", sUserEmail);
                await oOperation.execute();
                const aSuppliers2 = oOperation.getBoundContext().getObject().value;

                // Make model available to the fragment
                oController.getView().setModel(new JSONModel(aSuppliers2), "partners");

            } catch (oError) {
                MessageToast.show("Unable to load suppliers");
                console.error(oError);
                return;
            }

            if (!this._oAddDialog) {
                this._oAddDialog =await this.loadFragment({
                    name: "hpbuysell.mdm.usermgmtui.ext.fragment.PartnerAssignment"
                });
                var oTable = this._oAddDialog.getContent()[0].getItems()[1];
                oTable.addColumn(new sap.m.Column({
                    header: new sap.m.Text({
                        text: "Supplier ID"
                    })
                }));
                oTable.addColumn(new sap.m.Column({
                    header: new sap.m.Text({
                        text: "Supplier Name"
                    })
                }));
                var oTemplate = new sap.m.ColumnListItem({
                    cells: [
                        new sap.m.Text({ text: "{partners>supplierId}" }),
                        new sap.m.Text({ text: "{partners>supplierName}" })
                    ]
                });
                oTable.bindItems({
                    path: "partners>/",
                    template: oTemplate
                });
                this._oAddDialog.setTitle("Select Supplier ID");
                this._oAddDialog.open();
            }
            else this._oAddDialog.open();
        },
        _helperFunction: function(sEntitySet) {
            //call resp entity sets
        },
        onSearchCustomer: function(oEvent){
            debugger;
        },
        onAddPartner: async function(oEvent){

            //create a new assignment in the db - make sure to handle both customer and supplier cases
            debugger;
            const oContext = oEvent.getSource().getBindingContext();
            const oModel = this._controller.getView().getModel();
            const oTable = oEvent.getSource().getParent().getContent()[0].getItems()[1];
            const oSelectedItem = oTable.getSelectedItem();
            if (!oSelectedItem) {
                MessageToast.show("Please select a partner.");
                return;
            }
            const selectedPartner = oSelectedItem.getBindingContext("partners").getObject();
            //fetch user_email, partnerType, partnerId, partnerName
            const oUser = this._controller.getView().getBindingContext().getObject();
            const oPayload = {
                user_email: oUser.email,
                partnerType: this._custAsstFlag ? "C" : "S",
                partnerId: this._custAsstFlag ? selectedPartner.customerId : selectedPartner.supplierId,
                partnerName: this._custAsstFlag ? selectedPartner.customerName : selectedPartner.supplierName
            };
            const oListBinding = oModel.bindList("/PartnerAssignments");
            try {
                await oListBinding.create(oPayload);
                MessageToast.show("Partner assignment created successfully.");
                await oContext.requestSideEffects([
                    {
                        $NavigationPropertyPath: this._custAsstFlag ? "customers" : "suppliers",
                    }
                ]);
            } catch (oError) {
                MessageToast.show("Failed to create partner assignment.");
                console.error(oError);
            }
            this._custAsstFlag = false;
            this._oAddDialog.close();
            this._oAddDialog.destroy();
            this._oAddDialog = null;
        },
        onCancelDialog: async function(oEvent){
            this._custAsstFlag = false;
            this._oAddDialog.close();
            this._oAddDialog.destroy();
            this._oAddDialog = null;
        }
    };
});
