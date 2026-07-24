sap.ui.define(['sap/ui/core/mvc/ControllerExtension', 'sap/m/MessageToast'], function (ControllerExtension, MessageToast) {
	'use strict';

	return ControllerExtension.extend('hpbuysell.mdm.usermgmtui.ext.controller.CustomControllerForObjPage', {
		// this section allows to extend lifecycle hooks or hooks provided by Fiori elements
		override: {
			/**
             * Called when a controller is instantiated and its View controls (if available) are already created.
             * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
             * @memberOf hpbuysell.mdm.usermgmtui.ext.controller.CustomControllerForObjPage
             */
			onInit: function () {
				// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
				var oModel = this.base.getExtensionAPI().getModel();
			},
			onAfterRendering: function () {
				// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
				var oModel = this.base.getExtensionAPI().getModel();
			},
			editFlow: {
				onBeforeSave: async function (oEvent) {
					// new sap.m.MessageToast.show("onBeforeSave called - test");
					// const oModel = this.base.getExtensionAPI().getModel();
					// const oContext = this.base.getView().getBindingContext();
					// const aProjectsToBeAdded = this.base.getView().getModel("projectsToBeAdded").oData;
					// const aProjectsToBeRemoved = this.base.getView().getModel("projectsToBeRemoved").oData;
					// const sPartnerUuid = this.base.getView().getModel("partnerUuid").oData;
					// debugger;
				}
			}
		}
	});
});
