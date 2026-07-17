sap.ui.define([
    "sap/m/MessageToast"
], function(MessageToast) {
    'use strict';

    return {
        /**
         * Generated event handler.
         *
         * @param oEvent the event object provided by the event provider.
         */
        onPress_nosuchfunction: function(oEvent) {
            MessageToast.show("Custom handler invoked.");
        }
    };
});
