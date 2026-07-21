using UserManagementService as service from '../../srv/hpbuysellmdmusermgmt-service';

annotate service.Users with @(
    UI.HeaderInfo : {
        TypeName : 'User',
        TypeNamePlural : 'Users',
        Title : { Value : email },
        Description : { Value : '{firstName} {lastName}' },
    },

    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : email,
                Label : 'Email',
            },
            {
                $Type : 'UI.DataField',
                Value : firstName,
                Label : 'First Name',
            },
            {
                $Type : 'UI.DataField',
                Value : lastName,
                Label : 'Last Name',
            },
            {
                $Type : 'UI.DataField',
                Value : createdBy,
                Label : 'Created By',
            },
            {
                $Type : 'UI.DataField',
                Value : createdAt,
                Label : 'Created At',
            },
            {
                $Type : 'UI.DataField',
                Value : modifiedBy,
                Label : 'Modified By',
            },
            {
                $Type : 'UI.DataField',
                Value : modifiedAt,
                Label : 'Modified At',
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'CustomerAsstsFacet',
            Label : 'Customer Assignments',
            Target : 'customers/@UI.LineItem',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'SupplierAsstsFacet',
            Label : 'Supplier Assignments',
            Target : 'suppliers/@UI.LineItem',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'ChangeLogsFacet',
            Label : 'Change Logs',
            Target : 'changeLogs/@UI.LineItem#ChangeLogs',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : email,
            Label : 'Email',
        },
        {
            $Type : 'UI.DataField',
            Value : firstName,
            Label : 'First Name',
        },
        {
            $Type : 'UI.DataField',
            Value : lastName,
            Label : 'Last Name',
        },
        {
            $Type : 'UI.DataField',
            Value : createdBy,
            Label : 'Created By',
        },
        {
            $Type : 'UI.DataField',
            Value : createdAt,
            Label : 'Created At',
        },
    ],
    UI.SelectionFields : [
        email,
        firstName,
        lastName,
    ]
);


annotate service.PartnerAssignments with @(
    Capabilities: {
        InsertRestrictions: {Insertable: true},
        DeleteRestrictions: {Deletable: true}
    },
    UI.LineItem: [
        {
            $Type : 'UI.DataField',
            Value : partnerId,
            Label : 'Customer ID',
        },
        {
            $Type : 'UI.DataField',
            Value : partnerName,
            Label : 'Customer Name',
        },
    ],
    // UI.LineItem: [
    //     {
    //         $Type : 'UI.DataField',
    //         Value : partnerId,
    //         Label : 'Supplier ID',
    //     },
    //     {
    //         $Type : 'UI.DataField',
    //         Value : partnerName,
    //         Label : 'Supplier Name',
    //     },
    // ]
);

annotate service.Users:firstName with @(
    Common.Label: 'Customer ID',
    Common.ValueListWithFixedValues: false,
    Common.ValueList: {
        Label: 'Select Customer',
        CollectionPath: 'CustomerMaster',
        Parameters: [
        { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: partnerId,   ValueListProperty: 'customerId' },
        { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: partnerName, ValueListProperty: 'customerName' },
        ]
    }
);

annotate service.PartnerAssignments:partnerId with @(
  Common.Label: 'Customer ID',
  Common.ValueListWithFixedValues: false,
  Common.ValueList: {
    Label: 'Select Customer',
    CollectionPath: 'CustomerMaster',
    Parameters: [
      { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: partnerId,   ValueListProperty: 'customerId' },
      { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: partnerName, ValueListProperty: 'customerName' },
    ]
  }
);
annotate service.Users:suppliers.partnerId with @(
  Common.Label: 'Supplier ID',
  Common.ValueList: {
    Label: 'Select Supplier',
    CollectionPath: 'SupplierMaster',
    Parameters: [
      { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: partnerId,   ValueListProperty: 'supplierId' },
      { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: partnerName, ValueListProperty: 'supplierName' },
    ]
  }
);

annotate service.ChangeLogs with @(
    UI.LineItem #ChangeLogs: [
        {
            $Type : 'UI.DataField',
            Value : changedBy,
            Label : 'User',
        },
        {
            $Type : 'UI.DataField',
            Value : objectType,
            Label : 'Object Type',
        },
        {
            $Type : 'UI.DataField',
            Value : fieldName,
            Label : 'Field Name',
        },
        {
            $Type : 'UI.DataField',
            Value : oldValue,
            Label : 'Old Value',
        },
        {
            $Type : 'UI.DataField',
            Value : newValue,
            Label : 'New Value',
        },
    ]
);