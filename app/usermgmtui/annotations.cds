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
                Value : createdOn,
                Label : 'Created On',
            },
            {
                $Type : 'UI.DataField',
                Value : changedBy,
                Label : 'Changed By',
            },
            {
                $Type : 'UI.DataField',
                Value : changedOn,
                Label : 'Changed On',
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
            Target : 'changeLogs/@UI.LineItem',
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
            Value : createdOn,
            Label : 'Created On',
        },
    ],
    UI.SelectionFields : [
        email,
        firstName,
        lastName,
    ]
);

annotate service.PartnerAssignments with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : partnerId,
            Label : 'Partner ID',
        },
        {
            $Type : 'UI.DataField',
            Value : partnerName,
            Label : 'Partner Name',
        },
    ]
);

annotate service.ChangeLogs with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : user_email,
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