namespace hpbuysell.mdm.usermgmt;

using {cuid} from '@sap/cds/common';

/**
 * Primary entity: application Users
 * Email is the business key. Only firstName/lastName may
 * be changed once a record has been created.
 */
entity Users {

    key email      : String(241)
        @title: '{i18n>Email}';

        firstName  : String(100)
        @title: '{i18n>FirstName}'
        @mandatory;

        lastName   : String(100)
        @title: '{i18n>LastName}'
        @mandatory;

        createdBy  : String(255)
        @title: '{i18n>CreatedBy}';

        createdOn  : Timestamp
        @title: '{i18n>CreatedOn}';

        changedBy  : String(255)
        @title: '{i18n>ChangedBy}';

        changedOn  : Timestamp
        @title: '{i18n>ChangedOn}';

        customers  : Composition of many PartnerAssignments
                         on  customers.user        = $self
                         and customers.partnerType = 'C';

        suppliers  : Composition of many PartnerAssignments
                         on  suppliers.user        = $self
                         and suppliers.partnerType = 'S';

        changeLogs : Composition of many ChangeLogs
                         on changeLogs.user = $self;
}


entity PartnerAssignments : cuid {

    user        : Association to Users;

    @title: '{i18n>PartnerType}'
    @mandatory
    partnerType : String(1) enum {
        Customer = 'C';
        Supplier = 'S';
    };

    partnerId   : String(20)
    @title: '{i18n>PartnerId}'
    @mandatory;

    partnerName : String(100)
    @title: '{i18n>PartnerName}';

    projects    : Composition of many ProjectAssignments
                      on projects.partner = $self;
}


entity ProjectAssignments : cuid {

    partner     : Association to PartnerAssignments;

    projectId   : String(20)
    @title: '{i18n>ProjectId}'
    @mandatory;

    projectName : String(100)
    @title: '{i18n>ProjectName}';
}


entity ChangeLogs : cuid {

    user       : Association to Users;

    objectType : String(30)
    @title: '{i18n>ObjectType}';

    objectKey  : String(100)
    @title: '{i18n>ObjectKey}';

    fieldName  : String(100)
    @title: '{i18n>FieldName}';

    oldValue   : LargeString
    @title: '{i18n>OldValue}';

    newValue   : LargeString
    @title: '{i18n>NewValue}';

    changeType : String(10)
    @title: '{i18n>ChangeType}';

    changedBy  : String(255)
    @title: '{i18n>ChangedBy}';

    changedOn  : Timestamp
    @title: '{i18n>ChangedOn}';
}


entity CustomerMaster {

    key customerId   : String(20)
        @title: '{i18n>CustomerId}';

        customerName : String(100)
        @title: '{i18n>CustomerName}';

        status       : String(1);
}


entity SupplierMaster {

    key supplierId   : String(20)
        @title: '{i18n>SupplierId}';

        supplierName : String(100)
        @title: '{i18n>SupplierName}';

        status       : String(1);
}


entity ProjectMaster {

    key projectId   : String(20)
        @title: '{i18n>ProjectId}';

        projectName : String(100)
        @title: '{i18n>ProjectName}';

        status      : String(1);
}
