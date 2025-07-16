// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-otp-verification',
//   templateUrl: './otp-verification.component.html',
//   styleUrls: ['./otp-verification.component.css']
// })
// export class OtpVerificationComponent {

// }

import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-otp-verification',
  templateUrl: './otp-verification.component.html'
})
export class OtpVerificationComponent {
  userId: string = '';
  deviceId: string = '';
  otpCode: string = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {
    this.route.queryParams.subscribe(params => {
      this.userId = params['userId'];
      this.deviceId = params['deviceId'];
    });
  }

  verifyOTP(): void {
    const otpPayload = {
      userId: this.userId,
      code: this.otpCode,
      deviceId: this.deviceId
    };

    this.http.post<any>('http://localhost:5000/api/auth/verify-otp', otpPayload).subscribe({
      next: (res) => {
        console.log('OTP Verified:', res.token);
        // Save token, navigate to dashboard
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('OTP Verification Failed', err);
      }
    });
  }
}
