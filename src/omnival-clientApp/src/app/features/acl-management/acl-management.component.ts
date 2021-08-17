import { RefreshData } from '../../core/modals';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import * as $ from 'jquery';
import { RoleService, ClientContactTypeService, AuthenticationService, ClientbranchService, ClientuserService, ClientService, SignalRService } from "../../core/services"
import { FormBuilder, FormGroup, Validators, FormControl, AbstractControl, ValidatorFn, FormGroupDirective } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, tap } from 'rxjs/operators';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { debug } from 'console';
import { accessType } from '../../core/enum';


// ********* Helper Import ********* //
import { PasswordValidation } from '../core/_helpers/must-match.validator';
import { UsernameValidator } from '../core/_helpers/username.validator';
import { empty } from 'rxjs';
import { Subscription } from 'rxjs';
import { BaseComponent } from 'src/app/core/components';
// ********* Helper Import ********* //

const trimValidator: ValidatorFn = (control: FormControl) => {
  if (control.value != undefined && control.value.startsWith(' ')) {
    return {
      'trimError': { value: 'control has leading whitespace' }
    };
  }
  return null;
};

@Component({
  selector: 'app-acl-management',
  templateUrl: './acl-management.component.html',
  styleUrls: ['./acl-management.component.css']
})

export class AclManagementComponent extends BaseComponent  implements OnInit {

  UserCustomForm: FormGroup;
  ChangePasswordFrom: FormGroup;
  roleList = [];
  clientUserList = [];
  contactType = [];
  branches = [];
  hide = true;
  isCustomPermissionChanged = false;
  subGroups = []
  errorMessage: string = '';
  successMessage: any;
  loading: boolean;
  gifLoader = false;
  modalRef: BsModalRef;
  loadingforgot: boolean = false;
  roleForm: FormGroup;
  modal: any;
  isEdit: boolean;
  userRoleId: any;
  userId: any;
  permissions: any;
  clientUserNames: string;
  accessFor: string;
  permissionEventCheck: boolean;
  permissionData: any;
  public heading: string = '';
  public btnHeading: string = '';
  allowRoleUpdate: boolean;
  enable: boolean[] = [];
  selectedRow: Number;
  currentUserId: number;
  UserBranchArray: any = []
  UserSubGroupArray: any = []
  SaveSelection: boolean[] = [];
  editSelection: boolean[] = [];
  setting: any;
  private signalRSubscription: Subscription;
  @ViewChild(FormGroupDirective) userFormDirective;


  constructor(
    private fb: FormBuilder,
    private RoleService: RoleService,
    private ClientuserService: ClientuserService,
    private ClientService: ClientService,
    private ClientContactTypeService: ClientContactTypeService,
    private snackBar: MatSnackBar,
    private formBuilder: FormBuilder,
    private modalService: BsModalService,
    private AuthenticationService: AuthenticationService,
    private ClientbranchService: ClientbranchService,
    private router: Router,
    private signalrService: SignalRService
  ) {

    this.signalRSubscription = this.signalrService.getRefreshData().subscribe(
      (refreshData) => {
        var clientId = localStorage.getItem("clientID");
        if (refreshData.clientId == parseInt(clientId) && refreshData.refeshDataOf == 7) {
          this.AuthenticationService.permissionFunction();
          this.getClientRoleList();
        }
      });
    super();
  }

  ngOnInit() {

    this.permissions = this.AuthenticationService.permissionFunction();

    this.roleForm = this.formBuilder.group({
      clientRoleId: [''],
      roleName: ['', [Validators.required, Validators.maxLength(100), trimValidator]],
      description: ['', [Validators.maxLength(1000)]],
    });


    // User form

    // ********* Company Profile Forms Values Declare ********* //
    this.UserCustomForm = this.formBuilder.group({
      //userTypeId: [0, Validators.compose([Validators.required])],
      clientRoleId: [0, [Validators.required, Validators.min(1)]],
      userRoleName: ['', []],
      contactTypeName: ['', []],
      userBranches: [[], []],
      userSubGroups: [[], []],
      userId: [0, [Validators.required]],
      contactTypeId: [0, [Validators.required, Validators.min(1)]],
      firstName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern("^[a-zA-Z-0-9 '.-]+$"), trimValidator]],
      lastName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern("^[a-zA-Z-0-9 '.-]+$"), trimValidator]],
      userEmail: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$')]],
      userWorkPhone: ['', [Validators.maxLength(100)]],
      userCellPhone: ['', [Validators.maxLength(100)]],
      isMasterUser: [false],
      isChangePasswordFirstLogin: [false],
      userLogin: ['', [Validators.required, Validators.maxLength(100), UsernameValidator.cannotContainSpace]],
      password: ["", [Validators.required, this.checkPassword]],
      confirmPassword: ["", [Validators.required, this.checkPassword]],

    },
      {
        validator: PasswordValidation.MatchPassword
      }
    );

    this.ChangePasswordFrom = this.formBuilder.group({
      password: ["", Validators.compose([Validators.required, this.checkPassword])],
      confirmPassword: ["", Validators.compose([Validators.required, this.checkPassword])],
      isChangePasswordFirstLogin: [false]
    },
      {
        validator: PasswordValidation.MatchPassword
      }
    );

    // ********* Company Profile Forms Values Declare ********* //

    $(document).ready(function () {
      $("#openPop").click(function () {
        $(".LowVisibilityDivCreatedEditUser").addClass("openedpopeup");
      });


      $(".btn-close-edituser").click(function () {
        $(".LowVisibilityDivCreatedEditUser").removeClass("openedpopeup");
      });


      $(".btn-close-change-password").click(function () {

        $(".LowVisibilityDivChangePassword").removeClass("openedpopeup");
      });
    });


    this.getClientRoleList();
    //this.getUserType();
    this.getclientUsers();
    this.getContactType();
    this.getClientSetting();
    this.getclientbranches()
    this.reset();
    this.userRoleId = localStorage.getItem("userRoleId")
    this.currentUserId = JSON.parse(localStorage.getItem("currentUser")).user.userID;
  }

  getclientbranches() {
    var clientId = localStorage.getItem("clientID");
    this.ClientbranchService.setClientId = clientId;
    this.ClientbranchService.getAllParentBranches().pipe(
      tap(result => {
        console.log(result)
        this.branches = result.data.clientBranches
      },
        (error: any) => {
          this.errorMessage = error.error.message;
          this.snackBar.open(this.errorMessage, '', {
            duration: 2000,
          });
          console.log(`error on retriving Branches list : ${error}`);
        }
      ),
      finalize(() => {
        //this.changeDetectorRefs.detectChanges();
      })
    )
      .subscribe(
      );
  }


  getClientSetting() {
    var clientId = localStorage.getItem("clientID");
    if (localStorage.getItem("settings") != null) {
      var settingObject = localStorage.getItem("settings");
      this.setting = JSON.parse(settingObject);
    }
    else {
      this.ClientService
        .getClientSetting(clientId)
        .pipe(
          tap(result => {
            if (result.data != null && result.data != undefined)
              this.setting = result.data;
            localStorage.setItem("settings", JSON.stringify(this.setting));
          },
            (error: any) => {
              console.log(`error on retriving state list : ${error}`);
            }
          ),
          finalize(() => { })
        )
        .subscribe();
    }
  }

  getclientUsers(filter?: any) {
    this.gifLoader = true
    var clientId = localStorage.getItem("clientID");
    this.ClientuserService.setClientId = clientId;
    this.ClientuserService.getAll(filter).pipe(
      tap(result => {
        this.gifLoader = false
        console.log(result)

        this.clientUserList = result.data.clientUsers


      },
        (error: any) => {
          this.gifLoader = false
          this.errorMessage = error.error.message;
          this.snackBar.open(this.errorMessage, '', {
            duration: 2000,
          });
          console.log(`error on retriving product type list : ${error}`);
        }
      ),
      finalize(() => {
        //this.changeDetectorRefs.detectChanges();
      })
    )
      .subscribe(
      );
  }

  getContactType() {
    this.gifLoader = true
    this.ClientContactTypeService
      .getAll()
      .pipe(
        tap(result => {
          this.contactType = result.data.clientContactTypes;
          this.gifLoader = false
        },
          (error: any) => {
            this.gifLoader = false
            this.errorMessage = error.error.message;
            console.log(`error on retriving state list : ${error}`);
          }
        ),
        finalize(() => { })
      )
      .subscribe();
  }

  getClientRoleList() {
    this.gifLoader = true
    var clientId = localStorage.getItem("clientID");
    this.RoleService.getRoleList(clientId).pipe(
      tap(result => {
        console.log(result)
        this.gifLoader = false
        this.roleList = result.data.clientRoles
        //this.roleList = this.roleList.filter(x => x.roleId != 1);
      },
        (error: any) => {
          this.gifLoader = false
          this.errorMessage = error.error.message;
          this.snackBar.open(this.errorMessage, '', {
            duration: 2000,
          });
          console.log(`error on retriving roles : ${error}`);
        }
      ),
      finalize(() => {
        //this.changeDetectorRefs.detectChanges();
      })
    )
      .subscribe(
      );
  }

  assignCustomPermission(assignToAllUser: boolean) {
    ;

    if (this.accessFor === accessType.fullAccess) {
      this.fullAccess(this.permissionEventCheck, assignToAllUser, this.permissionData);
    } else {
      this.changeAccess(this.permissionEventCheck, this.permissionData, this.accessFor, assignToAllUser);
    }
    this.modalRef.hide();
  }

  fullAccess(event, assignToAllUser, permission) {
    // this.gifLoaderForm = true;
    permission.isView = event;
    permission.isCreate = event;
    permission.isUpdate = event;
    permission.isDelete = event;

    var clientId = localStorage.getItem("clientID");
    this.RoleService
      .changePermission(clientId, this.modal.clientRoleId, permission.permissionId, assignToAllUser, permission, this.permissionEventCheck)
      .pipe(
        tap(result => {

          // this.successMessage = result
          // this.snackBar.open(this.successMessage.message, '', {
          //   duration: 8000,
          // });
          // this.getClientRoleList();
          // this.modalRef.hide();
          // this.gifLoaderForm = false;
          this.snackBar.open('Changes Has Been Saved Successfully', '', {
            duration: 4000,
          });
        },
          error => {
            this.loadingforgot = false
            this.errorMessage = error.error.message;
            this.snackBar.open(this.errorMessage, '', {
              duration: 4000,
            });
            permission.isView = !event.checked;
            permission.isCreate = !event.checked;
            permission.isUpdate = !event.checked;
            permission.isDelete = !event.checked;
            this.gifLoaderForm = false;
          }),
        finalize(() => {
        })
      )
      .subscribe();
  }

  fullAccessNew(event, permission) {
    permission.isView = event.checked;
    permission.isCreate = event.checked;
    permission.isUpdate = event.checked;
    permission.isDelete = event.checked;
    this.modal.permissions[this.modal.permissions.findIndex(x => x.permissionId == permission.permissionId)].isView = event.checked;
    this.modal.permissions[this.modal.permissions.findIndex(x => x.permissionId == permission.permissionId)].isCreate = event.checked;
    this.modal.permissions[this.modal.permissions.findIndex(x => x.permissionId == permission.permissionId)].isUpdate = event.checked;
    this.modal.permissions[this.modal.permissions.findIndex(x => x.permissionId == permission.permissionId)].isDelete = event.checked;

  }

  fullAccessUser(event, permission) {
    // this.gifLoaderForm = true;
    permission.isView = event.checked;
    permission.isCreate = event.checked;
    permission.isUpdate = event.checked;
    permission.isDelete = event.checked;

    var clientId = localStorage.getItem("clientID");
    this.RoleService
      .changePermissionUser(clientId, this.modal.clientRoleId, this.modal.userId, permission.permissionId, permission)
      .pipe(
        tap(result => {

          // this.successMessage = result
          // this.snackBar.open(this.successMessage.message, '', {
          //   duration: 8000,
          // });
          // this.getClientRoleList();
          // this.modalRef.hide();
          // this.gifLoaderForm = false;
          this.snackBar.open('Changes Has Been Saved Successfully', '', {
            duration: 4000,
          });
          this.isCustomPermissionChanged = true
        },
          error => {
            this.loadingforgot = false
            this.errorMessage = error.error.message;
            this.snackBar.open(this.errorMessage, '', {
              duration: 4000,
            });
            permission.isView = !event.checked;
            permission.isCreate = !event.checked;
            permission.isUpdate = !event.checked;
            permission.isDelete = !event.checked;
            this.gifLoaderForm = false;
          }),
        finalize(() => {
        })
      )
      .subscribe();
  }

  changeAccessNew(event, permission, accessFor) {
    switch (accessFor) {
      case 'view':
        permission.isView = event.checked;
        permission.isCreate = permission.isCreate && event.checked;
        permission.isUpdate = permission.isUpdate && event.checked;
        permission.isDelete = permission.isDelete && event.checked;
        break;
      case 'create':
        permission.isCreate = event.checked;
        permission.isView = event.checked == true ? true : permission.isView;
        break;
      case 'update':
        permission.isUpdate = event.checked;
        permission.isView = event.checked == true ? true : permission.isView;
        break;
      case 'delete':
        permission.isDelete = event.checked;
        permission.isView = event.checked == true ? true : permission.isView;
        break;
      default:
        break;
    }
    this.modal.permissions[this.modal.permissions.findIndex(x => x.permissionId == permission.permissionId)].isView = event.checked;
    this.modal.permissions[this.modal.permissions.findIndex(x => x.permissionId == permission.permissionId)].isCreate = event.checked;
    this.modal.permissions[this.modal.permissions.findIndex(x => x.permissionId == permission.permissionId)].isUpdate = event.checked;
    this.modal.permissions[this.modal.permissions.findIndex(x => x.permissionId == permission.permissionId)].isDelete = event.checked;
  }

  changeAccess(event, permission, accessFor, assignToAllUser) {
    // this.gifLoaderForm = true;
    switch (accessFor) {
      case 'view':
        permission.isView = event;
        permission.isCreate = permission.isCreate && event;
        permission.isUpdate = permission.isUpdate && event;
        permission.isDelete = permission.isDelete && event;
        break;
      case 'create':
        permission.isCreate = event;
        permission.isView = event == true ? true : permission.isView;
        break;
      case 'update':
        permission.isUpdate = event;
        permission.isView = event == true ? true : permission.isView;
        break;
      case 'delete':
        permission.isDelete = event;
        permission.isView = event == true ? true : permission.isView;
        break;
      default:
        break;
    }

    var clientId = localStorage.getItem("clientID");
    this.RoleService
      .changePermission(clientId, this.modal.clientRoleId, permission.permissionId, assignToAllUser, permission, this.permissionEventCheck)
      .pipe(
        tap(result => {

          // this.successMessage = result
          // this.snackBar.open(this.successMessage.message, '', {
          //   duration: 8000,
          // });
          // this.getClientRoleList();
          // this.modalRef.hide();
          // this.gifLoaderForm = false;
          this.snackBar.open('Changes Has Been Saved Successfully', '', {
            duration: 4000,
          });
        },
          error => {
            this.gifLoaderForm = false;
            this.errorMessage = error.error.message;
            this.snackBar.open(this.errorMessage, '', {
              duration: 4000,
            });
            switch (accessFor) {
              case 'view':
                permission.isView = !event.checked;
                permission.isCreate = permission.isCreate && !event.checked;
                permission.isUpdate = permission.isUpdate && !event.checked;
                permission.isDelete = permission.isDelete && !event.checked;
                break;
              case 'create':
                permission.isCreate = !event.checked;
                permission.isView = !event.checked == true;
                break;
              case 'update':
                permission.isUpdate = !event.checked;
                permission.isView = !event.checked == true;
                break;
              case 'delete':
                permission.isDelete = !event.checked;
                permission.isView = !event.checked == true;
                break;
              default:
                break;
            }
          }),
        finalize(() => {
        })
      )
      .subscribe();
  }

  changeAccessUser(event, permission, accessFor) {
    // this.gifLoaderForm = true;
    switch (accessFor) {
      case 'view':
        permission.isView = event.checked;
        permission.isCreate = permission.isCreate && event.checked;
        permission.isUpdate = permission.isUpdate && event.checked;
        permission.isDelete = permission.isDelete && event.checked;
        break;
      case 'create':
        permission.isCreate = event.checked;
        permission.isView = event.checked == true ? true : permission.isView;
        break;
      case 'update':
        permission.isUpdate = event.checked;
        permission.isView = event.checked == true ? true : permission.isView;
        break;
      case 'delete':
        permission.isDelete = event.checked;
        permission.isView = event.checked == true ? true : permission.isView;
        break;
      default:
        break;
    }

    var clientId = localStorage.getItem("clientID");
    this.RoleService
      .changePermissionUser(clientId, this.modal.clientRoleId, this.modal.userId, permission.permissionId, permission)
      .pipe(
        tap(result => {

          // this.successMessage = result
          // this.snackBar.open(this.successMessage.message, '', {
          //   duration: 8000,
          // });
          // this.getClientRoleList();
          // this.modalRef.hide();
          // this.gifLoaderForm = false;
          this.snackBar.open('Changes Has Been Saved Successfully', '', {
            duration: 4000,
          });
          this.isCustomPermissionChanged = true
        },
          error => {
            this.gifLoaderForm = false;
            this.errorMessage = error.error.message;
            this.snackBar.open(this.errorMessage, '', {
              duration: 4000,
            });
            switch (accessFor) {
              case 'view':
                permission.isView = !event.checked;
                permission.isCreate = permission.isCreate && !event.checked;
                permission.isUpdate = permission.isUpdate && !event.checked;
                permission.isDelete = permission.isDelete && !event.checked;
                break;
              case 'create':
                permission.isCreate = !event.checked;
                permission.isView = !event.checked == true;
                break;
              case 'update':
                permission.isUpdate = !event.checked;
                permission.isView = !event.checked == true;
                break;
              case 'delete':
                permission.isDelete = !event.checked;
                permission.isView = !event.checked == true;
                break;
              default:
                break;
            }
          }),
        finalize(() => {
        })
      )
      .subscribe();
  }

  resetUserRolePermission(userId) {
    this.loadingforgot = true;
    console.log("userId is: ", userId);
    var clientId = localStorage.getItem("clientID");
    this.RoleService.resetUserRolePermission(clientId, userId).pipe(
      tap(result => {
        ;
        this.loadingforgot = false
        this.successMessage = result
        this.snackBar.open(this.successMessage.message, '', {
          duration: 8000,
        });
        this.getclientUsers();
        this.modalRef.hide();
        this.loadingforgot = false;
      },
        (error: any) => {
          ;
          this.loadingforgot = false;
          this.errorMessage = error.error.message;
          this.snackBar.open(this.errorMessage, '', {
            duration: 2000,
          });
          console.log(`error on retrieving role data : ${error}`);
        }),
      finalize(() => {
      })
    )
      .subscribe();
  }


  resetClientRolePermission(clientRoleId, deleteUserPermission) {
    var clientId = localStorage.getItem("clientID");
    this.RoleService.resetClientRolePermission(clientId, clientRoleId, deleteUserPermission).pipe(
      tap(result => {
        ;
        this.loadingforgot = false
        this.successMessage = result
        this.snackBar.open(this.successMessage.message, '', {
          duration: 8000,
        });
        this.getClientRoleList();
        this.modalRef.hide();
      },
        (error: any) => {
          ;
          this.errorMessage = error.error.message;
          this.snackBar.open(this.errorMessage, '', {
            duration: 2000,
          });
          console.log(`error on retrieving role data : ${error}`);
        }),
      finalize(() => {
      })
    )
      .subscribe();
  }

  deleteRole(clientRoleId) {
    this.loadingforgot = true
    var clientId = localStorage.getItem("clientID");
    this.RoleService
      .deleteRole(clientId, clientRoleId)
      .pipe(
        tap(result => {

          this.loadingforgot = false
          this.successMessage = result
          this.snackBar.open(this.successMessage.message, '', {
            duration: 8000,
          });
          this.getClientRoleList();
          this.modalRef.hide();
        },
          error => {
            this.loadingforgot = false
            this.errorMessage = error.error.message;
            this.snackBar.open(this.errorMessage, '', {
              duration: 8000,
            });
          }),
        finalize(() => {
        })
      )
      .subscribe();
  }

  openModalWithClass(template: TemplateRef<any>) {
    this.modalRef = this.modalService.show(
      template,
      Object.assign({}, { class: 'deletepopup' })
    );
  }

  openPermissionModalWithClass(template: TemplateRef<any>, event, permission, accessFor, clientRoleId) {

    ;
    console.log("permission Id is: ", permission.permissionId);

    this.accessFor = accessFor;
    this.permissionEventCheck = event.checked;
    this.permissionData = permission;

    var clientId = localStorage.getItem("clientID");
    this.RoleService.checkCustomPermission(clientId, clientRoleId).pipe(
      tap(result => {
        ;
        if (result.data != null && result.data.length > 0) {

          this.clientUserNames = result.data.map(function (userFullName) {
            return userFullName;
          }).join(", ");

          this.modalRef = this.modalService.show(
            template,
            Object.assign({}, { class: 'deletepopup' })
          );
        } else {
          if (this.accessFor === accessType.fullAccess) {
            this.fullAccess(this.permissionEventCheck, false, this.permissionData);
          } else {
            this.changeAccess(this.permissionEventCheck, this.permissionData, this.accessFor, false);
          }
        }
        console.log(result);
      },
        (error: any) => {
          ;
          this.errorMessage = error.error.message;
          this.snackBar.open(this.errorMessage, '', {
            duration: 2000,
          });
          console.log(`error on retrieving role data : ${error}`);
        }),
      finalize(() => {
      })
    )
      .subscribe();
  }

  closePermissionCheck() {
    this.getRoleData(this.modal.clientRoleId);
    this.modalRef.hide()
  }

  reset() {
    this.roleForm.patchValue({
      clientRoleId: 0,
      roleName: '',
      description: '',
    });
    this.modal = {
      clientRoleId: 0,
      roleName: '',
      description: '',
      permissions: []
    }

    // this.UserCustomForm.patchValue({
    //   userId: 0,
    //   clientRoleId: 0,
    //   contactTypeId: 0,
    //   firstName: '',
    //   lastName: '',
    //   userEmail: '',
    //   userWorkPhone: '',
    //   userCellPhone: '',
    //   userLogin: '',
    //   password: '',
    //   confirmPassword: '',
    //   isMasterUser: false,
    //   userBranches: [],
    //   userSubGroups: [],
    // });

  }

  //Form Validation Method
  public checkError = (controlName: string, errorName: string) => {
    return this.roleForm.controls[controlName].hasError(errorName);
  }

  //Form Validation Method
  public checkErrorUser = (controlName: string, errorName: string) => {
    return this.UserCustomForm.controls[controlName].hasError(errorName);
  }

  //Change Password Funcion
  changePassFunction(userid) {
    this.userId = userid
    this.ChangePasswordFrom.patchValue({ 'password': null });
    this.ChangePasswordFrom.patchValue({ "confirmPassword": null });
    //this.ChangePasswordFrom.controls["password"].setValue(null);
    //this.ChangePasswordFrom.controls["confirmPassword"].setValue(null);
    $(".LowVisibilityDivChangePassword").addClass("openedpopeup");

  }


  getErrorPasswordConfirmPass() {
    return this.ChangePasswordFrom.get('confirmPassword').hasError('required') ? 'Confirm Password is required' : '';
    //this.changeform.get('confirmPassword').hasError('minlength') ? 'Confirm password must contain at least 8 characters' : '';
    // this.changeform.get('confirmPassword').hasError('requirements') ? 'Password must contains at least 8 characters one numeric one uppercase one lowercase and one special character' : '';
  }


  getErrorPasswordUser() {
    return this.UserCustomForm.get('confirmPassword').hasError('required') ? 'Confirm Password is required' : '';

    //this.changeform.get('confirmPassword').hasError('minlength') ? 'Confirm password must contain at least 8 characters' : '';
    // this.changeform.get('confirmPassword').hasError('requirements') ? 'Password must contains at least 8 characters one numeric one uppercase one lowercase and one special character' : '';
  }


  //ChangePassword Form Send Method
  onChangePassword(data) {
    this.loadingforgot = true
    if (this.ChangePasswordFrom.invalid) {
      this.loadingforgot = false
      return
    }


    var clientId = localStorage.getItem("clientID");
    this.ClientuserService.setClientId = clientId;
    this.ClientuserService.changePasswordByUserId(this.userId, data)
      .pipe(
        tap(
          result => {
            this.snackBar.open(result.message, '', {
              duration: 8000,
            })
            this.loadingforgot = false;
            $(".LowVisibilityDivChangePassword").removeClass("openedpopeup");
          }, error => {
            this.loadingforgot = false;
            this.snackBar.open(error.error.message, '', {
              duration: 8000,
            });


          }
        ),
        finalize(() => { })
      )
      .subscribe();

  }


  openAddSlider(roleId) {
    this.onAdd();
  }
  closeAddSlider() {
    $(".addCheck").removeClass("openedpopeup");
  }
  isView = false;
  openEditSlider(roleId) {
    this.isView = false;
    if (roleId > 0) {
      this.onEdit(roleId);
    }
  }
  openViewSlider(data) {

    if (data.roleId == 1) {
      this.isView = true
    } else {
      this.isView = false
    }

    if (data.clientRoleId > 0) {
      this.onEdit(data.clientRoleId);
    }
  }

  closeEditSlider() {
    this.getClientRoleList();
    $(".editCheck").removeClass("openedpopeup");
  }

  openEditSliderUser(roleId, userId) {
    this.isView = false;
    this.loadingforgot = true;
    this.onEditUserPermission(roleId, userId);
  }

  openViewSliderUser(data) {

    if (data.userRoleId == 1) {
      this.isView = true
    } else {
      this.isView = false
    }

    if (data.userRoleId > 0) {
      this.onEditUserPermission(data.userRoleId, data.userId);
    }


    // this.isView = true;
    // this.onEditUserPermission(roleId, userId);
  }


  closeEditSliderUser() {
    if (this.isCustomPermissionChanged == true) {
      this.getclientUsers();
      this.isCustomPermissionChanged = false
    } else {
      this.gifLoader = false;
    }

    $(".editUserCheck").removeClass("openedpopeup");
  }

  onAdd() {
    this.errorMessage = "";
    this.reset();
    this.isEdit = true;
    var clientId = localStorage.getItem("clientID");
    this.RoleService.getForNewRole(clientId).pipe(
      tap(result => {

        this.roleForm.patchValue(result.data);
        this.modal = result.data;
        $(".addCheck").addClass("openedpopeup");
      },
        (error: any) => {
          this.errorMessage = error.error.message;
          this.snackBar.open(this.errorMessage, '', {
            duration: 2000,
          });
          console.log(`error on retrieving role data : ${error}`);
        }),
      finalize(() => {
      })
    )
      .subscribe();
  }

  onEdit(id: number) {
    this.loadingforgot = true
    this.reset();
    this.isEdit = true;
    var clientId = localStorage.getItem("clientID");
    this.RoleService.getRole(clientId, id).pipe(
      tap(result => {

        this.roleForm.patchValue(result.data);
        this.modal = result.data;
        $(".editCheck").addClass("openedpopeup");
        this.loadingforgot = false
      },
        (error: any) => {
          this.loadingforgot = false
          this.errorMessage = error.error.message;
          this.snackBar.open(this.errorMessage, '', {
            duration: 2000,
          });
          console.log(`error on retrieving role data : ${error}`);
        }),
      finalize(() => {
      })
    )
      .subscribe();
  }

  getRoleData(id: number) {
    this.loadingforgot = true
    var clientId = localStorage.getItem("clientID");
    this.RoleService.getRole(clientId, id).pipe(
      tap(result => {
        this.modal = result.data;
        this.loadingforgot = false
      },
        (error: any) => {
          this.loadingforgot = false
          this.errorMessage = error.error.message;
          this.snackBar.open(this.errorMessage, '', {
            duration: 2000,
          });
          console.log(`error on retrieving role data : ${error}`);
        }),
      finalize(() => {
      })
    )
      .subscribe();
  }


  onEditUserPermission(id: number, userid: number) {

    this.reset();
    this.gifLoader = true;
    var clientId = localStorage.getItem("clientID");
    this.RoleService.getRoleUser(clientId, id, userid).pipe(
      tap(result => {

        this.modal = result.data;
        $(".editUserCheck").addClass("openedpopeup");
        this.loadingforgot = false;
      },
        (error: any) => {
          this.gifLoader = false;
          this.errorMessage = error.error.message;
          this.snackBar.open(this.errorMessage, '', {
            duration: 2000,
          });
          console.log(`error on retrieving role data : ${error}`);
        }),
      finalize(() => {
      })
    )
      .subscribe();
  }

  onEditUser(id: number, i) {

    // this.gifLoader = true
    this.editRowProductFun(i);
    this.isEdit = true;
    this.isView = false;
    this.UserCustomForm.enable();
    this.ChangePasswordFrom.controls['']

    var clientId = localStorage.getItem("clientID");
    this.ClientuserService.setClientId = clientId;
    this.UserCustomForm.controls["password"].disable();
    this.UserCustomForm.controls["confirmPassword"].disable();
    this.UserCustomForm.controls["isChangePasswordFirstLogin"].disable();
    this.UserCustomForm.controls["userLogin"].disable();

    this.currentUserId = JSON.parse(localStorage.getItem("currentUser")).user.userID;
    this.ClientuserService.getById(id).pipe(
      tap(result => {


        var _userBranch = [];
        result.data.userBranches.forEach(userBranch => {
          if (userBranch['isSelected'] == true) {
            _userBranch.push(userBranch.branchName);
          }
        });

        this.UserBranchArray = result.data.userBranches;

        var _userSubGroup = [];

        result.data.userSubGroups.forEach(userBranch => {
          if (userBranch['isSelected'] == true) {
            _userSubGroup.push(userBranch.branchName);
          }
        });
        this.UserSubGroupArray = result.data.userSubGroups;




        this.UserCustomForm.patchValue(result.data);
        this.UserCustomForm.patchValue({ "userEmail": result.data.email });
        this.UserCustomForm.controls["clientRoleId"].setValue(result.data.clientRoleId);
        this.UserCustomForm.controls["userRoleName"].setValue(result.data.userRoleName);
        this.UserCustomForm.patchValue({
          userSubGroups: _userSubGroup,
        });
        this.UserCustomForm.patchValue({
          userBranches: _userBranch,
        });
        this.getclientsubgroups(-1, false);

        this.allowRoleUpdate = this.userRoleId == "1" && this.userId != id
        // this.ProductSpecTypes = result.data.vendorProductName;
        $(".LowVisibilityDivCreatedEditUser").addClass("openedpopeup");
        this.loadingforgot = false
        // this.gifLoader = true
      },
        (error: any) => {
          // this.gifLoader = true
          this.loadingforgot = false
          this.errorMessage = error.error.message;
          this.snackBar.open(this.errorMessage, '', {
            duration: 2000,
          });
          console.log(`error on retrieving User data : ${error}`);
        }),
      finalize(() => {
      })
    )
      .subscribe();
  }

  getclientsubgroups(branchId, forAdd) {
    var selectedBracnhes = [];

    this.UserCustomForm.controls["userBranches"].value.forEach(element => {
      for (let index = 0; index < this.branches.length; index++) {
        const branche = this.branches[index];
        if (branche.branchName == element) {
          selectedBracnhes.push(branche.branchId)
        }
      }
    });
    if (forAdd) {
      selectedBracnhes.push(branchId);
    }
    // else{
    //   const index = selectedBracnhes.indexOf(branchId);
    //   selectedBracnhes.splice(index, 1);
    // }
    if (selectedBracnhes.length <= 0) {
      selectedBracnhes.push(-1);
    }

    var clientId = localStorage.getItem("clientID");
    this.ClientbranchService.setClientId = clientId;
    this.ClientbranchService.getAllSubBranches(selectedBracnhes.join(',')).pipe(
      tap(result => {
        console.log(result)
        this.subGroups = result.data.clientBranches

        var existingSubGroups = [];
        this.UserCustomForm.controls["userSubGroups"].value.forEach(element => {
          for (let index = 0; index < this.subGroups.length; index++) {
            const subGroup = this.subGroups[index];
            if (subGroup.branchName == element) {
              existingSubGroups.push(subGroup.branchName)
            }
          }
        });
        this.UserCustomForm.get('userSubGroups').setValue(existingSubGroups);
      },
        (error: any) => {
          this.errorMessage = error.error.message;
          this.snackBar.open(this.errorMessage, '', {
            duration: 2000,
          });
          console.log(`error on retriving Branches list : ${error}`);
        }
      ),
      finalize(() => {
        //this.changeDetectorRefs.detectChanges();
      })
    )
      .subscribe(
      );
  }


  onSave(data) {
    this.create(data);
  }

  // Client Side edit remove show Functionality on table
  editRowProductFun(index) {
    this.enable[index] = true
    this.selectedRow = index;
    this.SaveSelection[index] = !this.SaveSelection[index]
    this.editSelection[index] = !this.editSelection[index]
  }

  cancelRowProductFun(index) {
    this.enable[index] = false
    this.selectedRow = null;
    this.SaveSelection[index] = !this.SaveSelection[index]
    this.editSelection[index] = !this.editSelection[index]
  }


  onSubGroupRemoved(topping: string) {
    const toppings = this.UserCustomForm.get('userSubGroups').value as string[];
    this.removeFirst(toppings, topping);
    this.UserCustomForm.get('userSubGroups').setValue(toppings); // To trigger change detection
  }

  // Chips User Branch Method
  onToppingRemoved(topping: string) {
    const toppings = this.UserCustomForm.get('userBranches').value as string[];
    this.removeFirst(toppings, topping);
    this.UserCustomForm.get('userBranches').setValue(toppings); // To trigger change detection
    this.getclientsubgroups(-1, false);
  }


  private removeFirst<T>(array: T[], toRemove: T): void {
    const index = array.indexOf(toRemove);
    if (index !== -1) {
      array.splice(index, 1);
    }
  }

  // Reset Form Method
  resetForm() {
    this.UserCustomForm.reset();
  }

  changeBranches(event) {

    if (event.isUserInput) {
      var branchId;
      for (let index = 0; index < this.branches.length; index++) {
        const branche = this.branches[index];
        if (branche.branchName == event.source.value) {
          branchId = branche.branchId;
        }
      }
      if (event.source.selected) {
        this.getclientsubgroups(branchId, true);
      }
    }
  }

  private create(data) {
    this.loadingforgot = true

    if (this.roleForm.status != "VALID") {
      this.loadingforgot = false
      return;
    }


    this.modal.clientRoleId = data.clientRoleId;
    this.modal.roleName = data.roleName;
    this.modal.description = data.description;

    var clientId = localStorage.getItem("clientID");
    this.RoleService.createRole(clientId, this.modal).pipe(
      tap(result => {
        this.loadingforgot = false
        this.successMessage = result.message;
        this.snackBar.open(this.successMessage, '', {
          duration: 4000,
        })
        this.roleForm.markAsPristine();
        this.getClientRoleList();
        $(".addCheck").removeClass("openedpopeup");
      },
        (error: any) => {
          this.loadingforgot = false
          this.errorMessage = error.error.message;
          this.snackBar.open(this.errorMessage, '', {
            duration: 2000,
          });
          console.log(`error on create role data : ${error}`);
        }),
      finalize(() => {
      })
    )
      .subscribe();
  }
  gifLoaderForm = false;
  updateName(data) {
    this.gifLoaderForm = true

    if (this.roleForm.status != "VALID") {
      this.gifLoaderForm = false
      return;
    }



    var clientId = localStorage.getItem("clientID");
    this.RoleService.updateRole(clientId, data.clientRoleId, data).pipe(
      tap(result => {
        this.gifLoaderForm = false
        this.successMessage = result.message;
        this.snackBar.open(this.successMessage, '', {
          duration: 4000,
        })
        this.roleForm.markAsPristine();
      },
        (error: any) => {
          this.gifLoaderForm = false
          this.errorMessage = error.error.message;
          this.snackBar.open(this.errorMessage, '', {
            duration: 2000,
          });
          console.log(`error on update role data : ${error}`);
        }),
      finalize(() => {
      })
    )
      .subscribe();
  }

  private update(data) {
    this.loadingforgot = true

    if (this.roleForm.status != "VALID") {
      this.loadingforgot = false
      return;
    }


    this.modal.clientRoleId = data.clientRoleId;
    this.modal.roleName = data.roleName;

    var clientId = localStorage.getItem("clientID");
    this.RoleService.updateRole(clientId, data.checklistTemplateId, this.modal).pipe(
      tap(result => {
        this.loadingforgot = false
        this.successMessage = result.message;
        this.snackBar.open(this.successMessage, '', {
          duration: 4000,
        })
        this.roleForm.markAsPristine();
        this.getClientRoleList();
        $(".addCheck").removeClass("openedpopeup");
      },
        (error: any) => {
          this.loadingforgot = false
          this.errorMessage = error.error.message;
          this.snackBar.open(this.errorMessage, '', {
            duration: 2000,
          });
          console.log(`error on update role data : ${error}`);
        }),
      finalize(() => {
      })
    )
      .subscribe();
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    (<any>Object).values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control.controls) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // User ACtivate And Deactivate Methods

  @ViewChild('templatestatus') public defaultTemplate: TemplateRef<any>;

  isblockedCurrentValue: boolean
  userIdIsBlocked: string

  CheckBlockState(event, userId) {

    this.userIdIsBlocked = userId
    this.isblockedCurrentValue = event.checked
    this.openModalIsBlocked(this.defaultTemplate);
  }


  openModalIsBlocked(template: TemplateRef<any>) {
    this.modalRef = this.modalService.show(
      template,
      this.config,
      // Object.assign({}, { class: 'deletepopup' })
    );
  }

  config = {
    ignoreBackdropClick: true,
    class: 'deletepopup'
  };

  closeModal() {
    this.modalRef.hide();
    this.getclientUsers();
  }

  deleteIsBlocked() {

    var clientId = localStorage.getItem("clientID");
    this.ClientuserService.setClientId = clientId;
    this.ClientuserService
      .putUserStatusActive(this.userIdIsBlocked, this.isblockedCurrentValue == true ? 'active' : 'de-active')
      .pipe(
        tap(result => {
          this.getclientUsers();
          this.modalRef.hide();
          this.successMessage = result
          this.snackBar.open(this.successMessage.message, '', {
            duration: 8000,
          });
          //this.getVendorCoverages();
          // this.modalRef.hide();
        },
          error => {
            //data.isServiceProvided = !event.checked;
            this.errorMessage = error.error.message;
            this.snackBar.open(this.errorMessage, '', {
              duration: 8000,
            });
          }),
        finalize(() => {
        })
      )
      .subscribe();
  }

  // User ACtivate And Deactivate Methods

  // User actions

  viewUserId(userId) {
    this.onView(userId)
  }

  onView(id: number) {

    try {
      this.gifLoader = true
      this.isView = true;
      this.isEdit = true;

      this.ChangePasswordFrom.controls['']

      var clientId = localStorage.getItem("clientID");
      this.ClientuserService.setClientId = clientId;
      this.UserCustomForm.disable();

      this.currentUserId = JSON.parse(localStorage.getItem("currentUser")).user.userID;
      this.ClientuserService.getById(id).pipe(
        tap(result => {


          var _userBranch = [];
          result.data.userBranches.forEach(userBranch => {
            if (userBranch['isSelected'] == true) {
              _userBranch.push(userBranch.branchName);
            }
          });

          this.UserBranchArray = result.data.userBranches;

          var _userSubGroup = [];

          result.data.userSubGroups.forEach(userBranch => {
            if (userBranch['isSelected'] == true) {
              _userSubGroup.push(userBranch.branchName);
            }
          });
          this.UserSubGroupArray = result.data.userSubGroups;




          this.UserCustomForm.patchValue(result.data);
          this.UserCustomForm.patchValue({ "userEmail": result.data.email });
          this.UserCustomForm.controls["clientRoleId"].setValue(result.data.clientRoleId);
          this.UserCustomForm.controls["userRoleName"].setValue(result.data.userRoleName);
          this.UserCustomForm.controls["contactTypeId"].setValue(result.data.contactTypeId);
          this.UserCustomForm.controls["contactTypeName"].setValue(result.data.contactTypeName);
          this.UserCustomForm.patchValue({
            userSubGroups: _userSubGroup,
          });
          this.UserCustomForm.patchValue({
            userBranches: _userBranch,
          });
          this.getclientsubgroups(-1, false);

          this.allowRoleUpdate = this.userRoleId == "1" && this.userId != id
          // this.ProductSpecTypes = result.data.vendorProductName;
          $(".LowVisibilityDivCreatedEditUser").addClass("openedpopeup");

          this.gifLoader = false

        },
          (error: any) => {
            this.gifLoader = false
            this.errorMessage = error.error.message;
            this.snackBar.open(this.errorMessage, '', {
              duration: 2000,
            });
            console.log(`error on retrieving User data : ${error}`);
          }),
        finalize(() => {
        })
      )
        .subscribe();
    }
    catch {
      this.gifLoader = false
      this.isView = false;
      this.isEdit = false;
    }
  }

  SendPassLinkFunction(userName) {

    this.AuthenticationService.forgotPass(userName)
      .pipe(
        tap(
          result => {
            this.snackBar.open(result.message, '', {
              duration: 8000,
            })
            this.loadingforgot = false;
            this.modalRef.hide()
          }, error => {
            this.snackBar.open(error.error.message, '', {
              duration: 8000,
            });
            this.loadingforgot = false;
            this.modalRef.hide()
          }
        ),
        finalize(() => { })
      )
      .subscribe();
  }

  //User Delete Method
  deleteUser(userId) {
    this.loadingforgot = true
    var clientId = localStorage.getItem("clientID");
    this.ClientuserService.setClientId = clientId;
    this.ClientuserService
      .delete(userId)
      .pipe(
        tap(result => {

          this.loadingforgot = false
          this.successMessage = result
          this.snackBar.open(this.successMessage.message, '', {
            duration: 8000,
          });
          this.getclientUsers();
          this.modalRef.hide();
        },
          error => {
            this.loadingforgot = false
            this.errorMessage = error.error.message;
            this.snackBar.open(this.errorMessage, '', {
              duration: 8000,
            });
          }),
        finalize(() => {
        })
      )
      .subscribe();
  }

  resetUserPermissions(userId) {

  }

  // End User actions




  removeFields(userFormDirective) {
    userFormDirective.resetForm()
    this.UserCustomForm.reset()
  }

  onSaveUser(data, userFormDirective: FormGroupDirective): void {



    this.UserCustomForm.controls["userLogin"].enable();
    data = this.UserCustomForm.value
    if (this.UserCustomForm.status != "VALID") {
      this.markFormGroupTouched(this.UserCustomForm);
      return;
    }
    if (data.userId > 0) {
      this.updateUser(data, userFormDirective);

    }
    else {
      this.createUser(data, userFormDirective);

    }
  }

  private updateUser(data, userFormDirective) {

    this.loadingforgot = true;
    data.userBranches = [];
    this.UserCustomForm.controls["userBranches"].value.forEach(element => {
      for (let index = 0; index < this.branches.length; index++) {
        const branche = this.branches[index];
        if (branche.branchName == element) {
          data.userBranches.push({ branchId: branche.branchId })
        }
      }
    });

    data.userSubGroups = [];
    this.UserCustomForm.controls["userSubGroups"].value.forEach(element => {
      for (let index = 0; index < this.subGroups.length; index++) {
        const branche = this.subGroups[index];
        if (branche.branchName == element) {
          data.userSubGroups.push({ branchId: branche.branchId })
        }
      }
    });


    var clientId = localStorage.getItem("clientID");
    this.ClientuserService.setClientId = clientId;
    data.userTypeId = parseInt(localStorage.getItem('userTypeId'));
    this.ClientuserService.putUser(data.userId, data).pipe(
      tap(result => {
        this.UserCustomForm.controls["userLogin"].disable();
        this.loadingforgot = false
        this.snackBar.open(result.message, '', {
          duration: 8000,
        })
        this.getclientUsers();
        $(".LowVisibilityDivCreatedEditUser").removeClass("openedpopeup");
        userFormDirective.resetForm()
        this.UserCustomForm.reset()
        // this.UserCustomForm.markAsPristine();
        // this.UserCustomForm.markAsUntouched();
        // this.UserCustomForm.reset();
      },
        (error: any) => {
          this.UserCustomForm.controls["userLogin"].disable();
          this.loadingforgot = false
          this.errorMessage = error.error.message;
          this.snackBar.open(this.errorMessage, '', {
            duration: 2000,
          });
          console.log(`error on update Client User data : ${error}`);
        }),
      finalize(() => {
      })
    )
      .subscribe();
  }


  private createUser(data, userFormDirective) {
    this.loadingforgot = true
    data.userBranches = [];
    this.UserCustomForm.controls["userBranches"].value.forEach(element => {
      for (let index = 0; index < this.branches.length; index++) {
        const branche = this.branches[index];
        if (branche.branchName == element) {
          data.userBranches.push({ branchId: branche.branchId })
        }
      }
    });

    data.userSubGroups = [];
    this.UserCustomForm.controls["userSubGroups"].value.forEach(element => {
      for (let index = 0; index < this.subGroups.length; index++) {
        const branche = this.subGroups[index];
        if (branche.branchName == element) {
          data.userSubGroups.push({ branchId: branche.branchId })
        }
      }
    });

    var clientId = localStorage.getItem("clientID");
    this.ClientuserService.setClientId = clientId;
    this.ClientuserService.create(data).pipe(
      tap(result => {
        debugger
        this.loadingforgot = false
        this.snackBar.open(result.message, '', {
          duration: 8000,
        })

        this.UserCustomForm.controls["userBranches"].patchValue = null
        this.UserCustomForm.controls["userSubGroups"].patchValue = null
        this.getclientUsers();
        $(".LowVisibilityDivCreatedEditUser").removeClass("openedpopeup");
        userFormDirective.resetForm()
        this.UserCustomForm.reset()
        // this.UserCustomForm.markAsPristine();
        // this.UserCustomForm.markAsUntouched();
        // this.UserCustomForm.reset();
      },
        (error: any) => {
          this.loadingforgot = false
          this.errorMessage = error.error.message;
          this.snackBar.open(this.errorMessage, '', {
            duration: 2000,
          });
          console.log(`error on create Client User data : ${error}`);
        }),
      finalize(() => {
      })
    )
      .subscribe();
  }


  SortColumnUser: boolean[] = [];
  sortuser(column) {
    if (this.SortColumnUser[column] == undefined) {
      this.SortColumnUser[column] = true;
    }
    if (this.SortColumnUser[column]) {
      this.ascendic(column, this.clientUserList);
    }
    else {
      this.descendic(column, this.clientUserList);
    }
    this.SortColumnUser[column] = !this.SortColumnUser[column];
  }

  SortColumn: boolean[] = [];
  sort(column) {

    if (this.SortColumn[column] == undefined) {
      this.SortColumn[column] = true;
    }
    if (this.SortColumn[column]) {
      this.ascendic(column, this.roleList);
    }
    else {
      this.descendic(column, this.roleList);
    }
    this.SortColumn[column] = !this.SortColumn[column];
  }

  ascendic(column, list) {
    list = list.sort((n1, n2) => {
      if (n1[column] < n2[column]) {
        return 1;
      }
      if (n1[column] > n2[column]) {
        return -1;
      }
      return 0;
    });
  }

  descendic(column, list) {
    list = list.sort((n1, n2) => {
      if (n1[column] > n2[column]) {
        return 1;
      }
      if (n1[column] < n2[column]) {
        return -1;
      }
      return 0;
    });
  }

  //start filter
  userRoleIdFilterText: number = 0;
  contactTypeIdFilterText: number = 0;

  focusOutSearchInput(input: string) {

    if (input != undefined && input != null && this.keywordFilterText != input.trim()) {
      this.keywordFilterText = input.trim();
      console.log(input.trim());
      this.applyFilter();
    }
  }
  keywordFilterText: string = '';
  filter: any = {};
  private applyFilter() {

    this.filter = {};
    if (this.keywordFilterText.trim() != '') {
      this.filter.key = this.keywordFilterText;
    }

    if (this.userRoleIdFilterText != 0) {

      this.filter.userRoleId = this.userRoleIdFilterText;
    }

    if (this.contactTypeIdFilterText != 0) {

      this.filter.contactTypeId = this.contactTypeIdFilterText;
    }

    this.getclientUsers(this.filter);
  }

  // Uzairs work

  selectedUserType(input: number) {
    if (input != undefined && input != null && this.userRoleIdFilterText != input) {
      this.userRoleIdFilterText = input;
      console.log(input);
      this.applyFilter();
    }
  }

  selectedContactType(input: number) {

    if (input != undefined && input != null && this.contactTypeIdFilterText != input) {
      this.contactTypeIdFilterText = input;
      console.log(input);
      this.applyFilter();
    }
  }

  // Check Passowrd Validation Function
  checkPassword(control: any) {
    let enteredPassword = control.value
    let passwordCheck = /^((?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[~!@#$%^&*()_+{}:\"<>?])).{8,}/;
    return (!passwordCheck.test(enteredPassword) && enteredPassword) ? { 'requirements': true } : null;
  }

  sendUserId(userId, i) {
    this.isView = false;
    if (userId > 0) {
      this.onEditUser(userId, i);
      this.heading = "Update User";
      this.btnHeading = "Update"
    }
    else {
      this.onAddUser();
      this.heading = "Add New User";
      this.btnHeading = "Add"
    }

  }

  onAddUser() {
    this.isEdit = false;
    this.isView = false;
    this.UserCustomForm.enable();
    this.errorMessage = "";
    this.UserCustomForm.controls["userLogin"].enable();
    this.UserCustomForm.controls["password"].enable();
    this.UserCustomForm.controls["confirmPassword"].enable();
    this.UserCustomForm.controls["isChangePasswordFirstLogin"].enable();
    this.reset();
  }



  // User Managments popup open
  // userManagmentPopupOpen(){
  //   $(".userManagmentOpen").addClass("openedpopeup");
  // }
  // User Managments popup open


}
