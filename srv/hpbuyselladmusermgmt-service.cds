using {hpbuysell.adm.usermgmt as db} from '../db/hpbuyselladmusermgmt-model';
using {sap.changelog as cl} from '@cap-js/change-tracking';

@changelog.Ui.ChangeHistoryView 
service UserManagementService 
@(path: '/user-management')
// @(require: 'authenticated-user')
{
    @odata.singleton  @cds.persistence.skip
 
    entity auth {

        key ID        : String;
            canCreate : Boolean;
            canUpdate : Boolean;
            canDelete : Boolean;
    }

    @restrict: [
        {
            grant: 'READ',
            to   : [
                'UsermgmtViewer',
                'UsermgmtManage'
            ]
        },
        {
            grant: [
                'CREATE',
                'UPDATE',
                'EXECUTE',
                'deactivateUserMain'
            ],
            to   : 'UsermgmtManage'
        }
 
    ]
    @odata.draft.enabled
    @(Capabilities: {
        InsertRestrictions: {Insertable: true},
        DeleteRestrictions: {Deletable: false},
        UpdateRestrictions: {Updatable: true}
    })
    entity Users              as projection on db.Users
    actions {
        @(
            cds.odata.bindingparameter.name: '_it',
            Common.SideEffects: {
                TargetProperties: [
                    '_it/active',
                    '_it/userGroupIndicator'
                ]
            }
        )
        action deactivateUserMain();
    };

    entity PartnerAssignments as projection on db.PartnerAssignments;
 
    entity ProjectAssignments as projection on db.ProjectAssignments;
 
    @readonly
    @restrict: [{ grant: 'READ', to: ['UsermgmtViewer', 'UsermgmtManage'] }]
    entity ChangeView as projection on cl.ChangeView;


    @readonly
    entity CustomerMaster     as projection on db.CustomerMaster
                                 where
                                     status = 'A';
 
    @readonly
    entity SupplierMaster     as projection on db.SupplierMaster
                                 where
                                     status = 'A';
 
    @readonly
    entity ProjectMaster      as projection on db.ProjectMaster
                                 where
                                     status = 'A';
 
    entity BusinessPartnerVH  as
            
            select from SupplierMaster {
                key supplierId   as partnerId,
                    cast(
                        null as String(10)
                    )            as customerId,
                    supplierId   as supplierId,
                    supplierName as partnerName,
                    cast(
                        'S' as String(1)
                    )            as partnerType,
                    cast(
                        null as String(241)
                    )            as userEmail
            }
            union all
            select from CustomerMaster {
                key customerId   as partnerId,
                    customerId   as customerId,
                    cast(
                        null as String(10)
                    )            as supplierId,
                    customerName as partnerName,
                    cast(
                        'C' as String(1)
                    )            as partnerType,
                    cast(
                        null as String(241)
                    )            as userEmail
            }
;
    entity UserGroups as projection on db.UserGroups;
    function searchUsers(searchTerm: String)                                                       returns array of Users;
    function getUnassignedCustomers(userEmail: String, isActiveEntity: Boolean)                    returns array of CustomerMaster;
    function getUnassignedSuppliers(userEmail: String, isActiveEntity: Boolean)                    returns array of SupplierMaster;
    function findSelectedProjects(partnerID: UUID, isActiveEntity: Boolean)                        returns array of ProjectMaster;
        
    action   exportUsers(emails: array of String)                                                  returns {
        fileName : String;
        base64   : LargeString;
    };
    action   addProjects(partnerID: UUID, isActiveEntity: Boolean, projectIds: array of String)    returns array of ProjectAssignments;
    action   removeProjects(partnerID: UUID, isActiveEntity: Boolean, projectIds: array of String) returns Boolean;
    action syncusers();
    
}
