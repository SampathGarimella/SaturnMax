# Email Setup

SaturnMax currently uses Firebase Authentication email templates for password setup and reset links.

## Current Production Email Flows

- Candidate forgot password from `/login`
- Consultant invitation/password setup from Manual Add Consultant
- Admin-created employee/admin/consultant password setup or reset

Firebase uses the same **Password reset** template for both forgot-password and invite/setup links, so keep the wording neutral.

Recommended template:

```txt
Subject: Set or reset your %APP_NAME% account password

Hi,

Use the link below to set or reset the password for %EMAIL%.

%LINK%

Candidate Portal:
https://saturnmax.com/login

Consultant Portal:
https://saturnmax.com/consultant-login

Employee/Admin Portal:
https://saturnmax.com/employee-login

If you did not request this email, contact hr@saturnmax.com.

Regards,
%APP_NAME%
```

## Where To Configure It

Firebase Console -> Authentication -> Templates -> Password reset.

Also confirm `saturnmax.com` is listed in Firebase Console -> Authentication -> Settings -> Authorized domains.

## What Is Not Active Yet

Application confirmation emails, candidate status update emails, contact-form notifications, and internal alert emails are not sent by a custom provider yet. The data is stored in Firestore, and employees/admins see it in the portal.

When you are ready, add a Cloud Function with a provider such as Resend, Postmark, SendGrid, or Firebase Extensions. Do not re-enable the deprecated FastAPI/Mongo email path.
