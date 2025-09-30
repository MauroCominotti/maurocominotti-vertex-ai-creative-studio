import {Component, Inject, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {UserModel, UserRolesEnum} from '../../common/models/user.model';

@Component({
    selector: 'app-user-form',
    templateUrl: './user-form.component.html',
    styleUrls: ['./user-form.component.scss'],
    standalone: false
})
export class UserFormComponent implements OnInit {
  userForm: FormGroup;
  isEditMode: boolean;
  availableRoles: UserRolesEnum[] = Object.values(UserRolesEnum);

  constructor(
    public dialogRef: MatDialogRef<UserFormComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {user: UserModel; isEditMode: boolean}, // Data passed to the dialog
    private fb: FormBuilder,
  ) {
    this.isEditMode = data.isEditMode;
    const user = data.user;

    this.userForm = this.fb.group({
      id: [user?.id],
      email: [{value: user?.email || '', disabled: true}, Validators.required],
      roles: [user?.roles || [], Validators.required],
    });
  }

  ngOnInit(): void {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      this.dialogRef.close(this.userForm.getRawValue()); // Pass the raw form value back to include disabled fields
    } else {
      this.userForm.markAllAsTouched(); // Show validation errors
    }
  }
}
