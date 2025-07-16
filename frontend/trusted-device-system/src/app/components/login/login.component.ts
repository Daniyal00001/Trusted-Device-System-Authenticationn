import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FingerprintService } from 'src/app/services/fingerprint.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent {
  email: string = '';
  password: string = '';

  constructor(
    private http: HttpClient,
    private fingerprintService: FingerprintService,
    private router: Router
  ) {}

  async login(): Promise<void> {
    const deviceId = await this.fingerprintService.getFingerprint();
    const loginPayload = {
      email: this.email,
      password: this.password,
      deviceId: deviceId
    };

    this.http.post<any>('http://localhost:5000/api/auth/login', loginPayload).subscribe({
      next: (res) => {
        console.log('Login Response:', res);

        if (res.otpRequired) {
          // Navigate to OTP screen, passing userId and deviceId
          this.router.navigate(['/verify-otp'], {
            queryParams: { userId: res.userId, deviceId: deviceId }
          });
        } else if (res.token) {
          console.log('Login Successful:', res.token);
          // Save token, navigate to dashboard, etc.
        }
      },
      error: (err) => {
        console.error('Login Failed', err);
      }
    });
  }
}
