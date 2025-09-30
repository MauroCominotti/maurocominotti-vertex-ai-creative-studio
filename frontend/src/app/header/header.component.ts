/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Component } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { UserModel } from '../common/models/user.model';
import { AuthService } from '../common/services/auth.service';
import { UserService } from '../common/services/user.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false
})
export class HeaderComponent {
  currentUser: UserModel | null;

  constructor(
    private sanitizer: DomSanitizer,
    public matIconRegistry: MatIconRegistry,
    public router: Router,
    public userService: UserService,
    public authService: AuthService,
  ) {
    this.matIconRegistry
      .addSvgIcon(
        'creative-studio-icon',
        this.setPath(`${this.path}/creative-studio-icon.svg`),
      )
      .addSvgIcon(
        'fun-templates-icon',
        this.setPath(`${this.path}/fun-templates-icon.svg`),
      )
      .addSvgIcon('flows-icon', this.setPath(`${this.path}/flows-icon.svg`));

    this.currentUser = this.userService.getUserDetails();
  }

  private path = '../../assets/images';

  private setPath(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  logout() {
    void this.authService.logout();
  }

  navigate() {
    void this.router.navigateByUrl('/');
  }
}
