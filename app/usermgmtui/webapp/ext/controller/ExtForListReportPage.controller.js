sap.ui.define(['sap/ui/core/mvc/ControllerExtension', 'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator'], function (ControllerExtension, Filter, FilterOperator) {
	'use strict';

	return ControllerExtension.extend('hpbuysell.mdm.usermgmtui.ext.controller.ExtForListReportPage', {
		// this section allows to extend lifecycle hooks or hooks provided by Fiori elements
		onBeforeRebindTable: function (oEvent) {
			var oBindingParams = oEvent.getParameter("bindingParams");
			var oCollectionBindingInfoAPI = oEvent.getParameter("collectionBindingInfo");
			const oFilterBar = this.base.getView().byId("fe::FilterBar::Users");
			const oFilterItems = oFilterBar.getFilterItems();
			//temp logic - next line
			var oCustomFilterField = oFilterItems[6];
			var oMultiInput = this.base.getView().byId("hpbuysell.mdm.usermgmtui::UsersList--fe::FilterBar::Users::CustomFilterField::filterbarFieldForProjects").getCurrentContent()[0].getContent()
			if (!oMultiInput) {
				return;
			}
			var aTokens = oMultiInput.getTokens();
			if (!aTokens.length) {
				return;
			}
			var aProjectIds = aTokens.map(function (oToken) {
				return oToken.getKey();
			});
			var aInnerOrFilters = aProjectIds.map(function (sId) {
				return new Filter("pj/projectId", FilterOperator.EQ, sId); // confirm exact property name on ProjectAssignments
			});

			var oInnerAny = new Filter({ filters: aInnerOrFilters, and: false });

			var oCustomersAny = new Filter({
				path: "customers",
				operator: FilterOperator.Any,
				variable: "pa",
				condition: new Filter({
					path: "pa/projects",
					operator: FilterOperator.Any,
					variable: "pj",
					condition: oInnerAny
				})
			});

			var oSuppliersAny = new Filter({
				path: "suppliers",
				operator: FilterOperator.Any,
				variable: "pa",
				condition: new Filter({
					path: "pa/projects",
					operator: FilterOperator.Any,
					variable: "pj",
					condition: oInnerAny
				})
			});

			var oOuterOr = new Filter({ filters: [oCustomersAny, oSuppliersAny], and: false });
			oCollectionBindingInfoAPI.addFilter(oOuterOr);
		},
		override: {
			/**
			 * Called when a controller is instantiated and its View controls (if available) are already created.
			 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
			 * @memberOf hpbuysell.mdm.usermgmtui.ext.controller.ExtForListReportPage
			 */
			onInit: function () {
				// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
				var oModel = this.base.getExtensionAPI().getModel();
			}
		}
	});
});
