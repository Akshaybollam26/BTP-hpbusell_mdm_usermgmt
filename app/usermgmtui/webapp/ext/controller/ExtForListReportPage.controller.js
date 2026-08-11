sap.ui.define(['sap/ui/core/mvc/ControllerExtension', 'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator'], function (ControllerExtension, Filter, FilterOperator) {
	'use strict';

	return ControllerExtension.extend('hpbuysell.mdm.usermgmtui.ext.controller.ExtForListReportPage', {
		// this section allows to extend lifecycle hooks or hooks provided by Fiori elements
		onBeforeRebindTable: function (oEvent) {
			const oCollectionBindingInfoAPI = oEvent.getParameter("collectionBindingInfo");
			const oFilterBar = this.base.getView().byId("fe::FilterBar::Users");
			const oFilterItems = oFilterBar.getFilterItems();
			var aProjectIds = [], haveTokens = true, haveTypedValue = true;
			var oMultiInput = this.base.getView().byId("hpbuysell.mdm.usermgmtui::UsersList--fe::FilterBar::Users::CustomFilterField::filterbarFieldForProjects").getCurrentContent()[0].getContent()
			if (!oMultiInput) {
				return;
			}
			var aTokens = oMultiInput.getTokens();
			var sTypedValue = oMultiInput?.getValue()?.trim();
			//check - execute filter if there are any tokens passed
			if (!aTokens.length)
				haveTokens = false;
			else{
				aProjectIds = aTokens.map(function (oToken) {
					return oToken.getKey();
				});
			}
			//check - execute further if atleast field is populated with typed value
			if(!sTypedValue)
				haveTypedValue = false;
			else
				aProjectIds.push(sTypedValue);
			//if nothing is selected or entered - return
			if(!haveTokens && !haveTypedValue)
				return;

			// Remove FE's automatically generated filter for the custom field.
			oCollectionBindingInfoAPI.filters = (oCollectionBindingInfoAPI.filters || []).filter(function (oFilter) {
				return oFilter.sPath !== "customers/user_email";
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
