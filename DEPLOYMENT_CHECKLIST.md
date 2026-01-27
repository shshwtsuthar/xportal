# 🚀 Approve Application Refactoring - Deployment Checklist

## Overview
This checklist guides you through deploying the refactored approve-application Edge Function.

---

## ✅ Pre-Deployment

### 1. Review Changes
- [ ] Read `REFACTORING_COMPLETE.md` - High-level summary
- [ ] Read `supabase/functions/approve-application/README.md` - Detailed docs
- [ ] Review SQL migration: `supabase/migrations/20260127000000_atomic_approve_application.sql`
- [ ] Review TypeScript changes: `supabase/functions/approve-application/index.ts`

### 2. Local Testing
```bash
# Start local Supabase
cd /home/shashwat/Documents/Projects/xportal
supabase start

# Apply migration locally
supabase db reset

# Deploy function locally
supabase functions deploy approve-application --local

# Test approval
curl -X POST http://127.0.0.1:54321/functions/v1/approve-application \
  -H "Authorization: Bearer YOUR_LOCAL_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"applicationId": "test-app-id"}'
```

- [ ] Local migration applied successfully
- [ ] Local function deployed successfully
- [ ] Test approval works (create test application first)
- [ ] Verify student created
- [ ] Verify enrollment created
- [ ] Test idempotency (approve same app twice)

---

## 🧪 Staging Deployment

### 1. Deploy to Staging
```bash
# Deploy migration
supabase db push --db-url "postgresql://staging-url"

# Deploy Edge Function
supabase functions deploy approve-application --project-ref STAGING_REF
```

- [ ] Migration deployed to staging
- [ ] Edge Function deployed to staging
- [ ] No deployment errors

### 2. Staging Tests
- [ ] Approve a new test application
- [ ] Verify student record created in DB
- [ ] Verify enrollment record created in DB
- [ ] Verify files copied to student bucket
- [ ] Verify auth user created (check Supabase Auth dashboard)
- [ ] Verify welcome email sent
- [ ] Retry same approval → Should succeed idempotently
- [ ] Test with application in wrong status → Should fail gracefully
- [ ] Test concurrent approvals → Only one should succeed

### 3. Performance Check
- [ ] Approval completes in 2-7 seconds
- [ ] No database timeout errors
- [ ] Monitor Edge Function logs for errors

---

## 🚀 Production Deployment

### 1. Pre-Production Checklist
- [ ] All staging tests passed
- [ ] Code reviewed by senior developer
- [ ] Documentation reviewed
- [ ] Rollback plan understood
- [ ] Team available for monitoring
- [ ] Deploy during low-traffic window

### 2. Deploy to Production
```bash
# Backup current production state (optional but recommended)
supabase db dump > backup_$(date +%Y%m%d_%H%M%S).sql

# Deploy migration
supabase db push

# Deploy Edge Function
supabase functions deploy approve-application
```

- [ ] Migration deployed successfully
- [ ] Edge Function deployed successfully
- [ ] No deployment errors

### 3. Smoke Tests (Immediately After Deployment)
- [ ] Approve 1-2 test applications
- [ ] Verify approvals succeed
- [ ] Check Edge Function logs
- [ ] Check database for new students/enrollments

### 4. Monitor (First Hour)
```bash
# Watch Edge Function logs
supabase functions logs approve-application --follow
```

- [ ] No unexpected errors in logs
- [ ] Approvals completing in expected time (2-7s)
- [ ] No increase in error rate
- [ ] Database performance normal

### 5. Monitor (First 24 Hours)
- [ ] Approval success rate normal
- [ ] No support tickets about "stuck" approvals
- [ ] Database performance stable
- [ ] No memory/CPU issues

---

## 🔄 Rollback Plan (If Needed)

### If Critical Issues Arise:

```bash
# 1. Revert Edge Function
git log --oneline  # Find commit hash before refactoring
git revert <commit-hash>
supabase functions deploy approve-application

# 2. Keep the SQL function - it's beneficial even with old code
# No need to rollback migration
```

- [ ] Old Edge Function redeployed
- [ ] Approvals working with old code
- [ ] Issue documented for later fix

---

## 📊 Post-Deployment Metrics

Track these over the next week:

### Technical Metrics
- Approval duration (should stay 2-7s)
- Approval failure rate (should decrease)
- Database transaction errors (should be zero or very low)
- File copy warnings (monitor frequency)
- Email delivery warnings (monitor frequency)

### Business Metrics
- Support tickets for approval issues (should decrease)
- Manual intervention required (should decrease)
- Student onboarding time (should stay same or improve)

---

## 📝 Documentation Updates

### After Successful Deployment:
- [ ] Update CHANGELOG.md with deployment date
- [ ] Document any issues encountered
- [ ] Share learnings with team
- [ ] Update internal wiki/docs if applicable

---

## 🎉 Success Criteria

Deployment is considered successful when:

✅ All staging tests passed  
✅ Production deployment completed without errors  
✅ Smoke tests passed in production  
✅ No errors in first hour of monitoring  
✅ Approvals completing in expected time  
✅ No increase in failure rate  
✅ No rollback required  

---

## 📞 Support Contacts

If issues arise:

**Database Issues**:
- Check: `supabase db logs`
- Rollback: Keep SQL function, it's safe

**Edge Function Issues**:
- Check: `supabase functions logs approve-application`
- Rollback: Revert to previous Edge Function version

**Business Logic Issues**:
- Check: Application status in database
- Check: Student/enrollment records
- Use idempotency to retry if needed

---

## 📚 Reference Documents

- `REFACTORING_COMPLETE.md` - Executive summary
- `supabase/functions/approve-application/README.md` - Complete API docs
- `supabase/functions/approve-application/DEVELOPER_GUIDE.md` - Developer reference
- `docs/approve-application-refactoring-summary.md` - Detailed analysis
- `docs/approve-application-architecture.md` - Architecture diagrams

---

**Prepared**: January 27, 2026  
**Status**: Ready for deployment

---

## Quick Commands Reference

```bash
# Local testing
supabase start
supabase db reset
supabase functions deploy approve-application --local

# Staging deployment
supabase db push --db-url "staging-url"
supabase functions deploy approve-application --project-ref STAGING_REF

# Production deployment
supabase db push
supabase functions deploy approve-application

# Monitoring
supabase functions logs approve-application --follow
supabase db logs

# Rollback
git revert <commit-hash>
supabase functions deploy approve-application
```
