# XPortal

## Contributing
1. Clone this repository
```
git clone https://github.com/shshwtsuthar/xportal.git
```

2. Install dependancies 
```
npm install
```

3. Start Supabase
```
supabase start
```

4. Verify the status and get your credentials
```
supabase status
```

5. Create your environment variables file 
```
touch .env.local
```

6. Copy your environment variables from `supabase status`
```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SERVICE_ROLE_KEY=your_supabase_service_role_key

XPORTAL_EMAIL=any_email
XPORTAL_PASSWORD=any_password
```

7. Start development server
```
npm run dev
```

8. Start Supabase edge functions server
```
supabase functions serve --no-verify-jwt
```

9. Visit server and login
You can visit `localhost:3000` and login with your XPORTAL_EMAIL and XPORTAL_PASSWORD.