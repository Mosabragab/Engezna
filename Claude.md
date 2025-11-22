# Claude Project Guide - Engezna (انجزنا)

**Last Updated:** November 22, 2025
**Project:** Engezna - Food Delivery Platform for Beni Suef, Upper Egypt
**Repository:** https://github.com/Mosabragab/Engezna
**Current Branch:** `claude/start-nextjs-dev-018Ax4ocUFpPUAU6hXViA8j9`

---

## 🎯 Project Overview

**Engezna (انجزنا)** is a B2C food delivery marketplace platform for Beni Suef, Upper Egypt. The platform connects local restaurants, coffee shops, and grocery stores with customers.

**Key Differentiator:** Ultra-low 5-7% commission model where providers manage their own delivery staff (vs competitors' 15-20% commission).

**Tech Stack:**
- Next.js 15.0.3 (App Router) + TypeScript
- Tailwind CSS 4 + shadcn/ui
- Supabase (PostgreSQL, Auth, Real-time)
- next-intl for i18n (Arabic/English)

---

## 📋 Claude's Working Rules

### **CRITICAL RULE: Progress Tracking**

**When completing ANY task from the project plan (PRD.md roadmap or weekly tasks):**

1. ✅ **Mark the task as complete** in the relevant section with `[x]`
2. 📝 **Update Claude.md** (this file):
   - Add entry to "Completed Tasks" section below
   - Update "Current Week Status" percentage
   - Note any blockers or issues encountered
3. 📊 **Update PRD.md**:
   - Mark corresponding roadmap item as complete `[x]`
   - Update week status (e.g., "✅ 95% COMPLETE")
   - Add notes about implementation details if significant
4. 🔄 **Commit changes** with clear message:
   - Example: `✨ Complete user authentication flow - Update progress in PRD and Claude.md`

**This ensures:**
- User can track progress at any time
- Project momentum is visible
- Nothing gets forgotten or duplicated
- Clear audit trail of what's been done

---

## 🚀 Development Workflow

### **Starting a New Task**

1. **Read relevant files** before making changes
2. **Check PRD.md** for requirements and context
3. **Update todo list** using TodoWrite tool
4. **Mark task as in_progress** in this file
5. **Implement the feature**
6. **Test thoroughly** (manual testing at minimum)
7. **Update documentation** (this file + PRD.md)
8. **Commit and push** to the feature branch

### **Code Quality Standards**

- ✅ TypeScript strict mode - no `any` types
- ✅ ESLint compliance - fix all warnings
- ✅ Responsive design - mobile-first approach
- ✅ Accessibility - WCAG 2.1 AA compliance
- ✅ RTL support - proper Arabic text rendering
- ✅ Dark mode - all components support both themes
- ✅ Error handling - graceful degradation
- ✅ Performance - optimize images, lazy load components

### **Git Commit Message Format**

Use conventional commits with emojis:

- ✨ `:sparkles:` - New feature
- 🐛 `:bug:` - Bug fix
- 📝 `:memo:` - Documentation
- 💄 `:lipstick:` - UI/styling
- ♻️ `:recycle:` - Refactoring
- 🚀 `:rocket:` - Performance
- 🔧 `:wrench:` - Configuration
- 🧪 `:test_tube:` - Tests

**Examples:**
```
✨ Add user authentication with Supabase
🐛 Fix 404 error in next-intl routing
📝 Update PRD with Week 1 progress
💄 Implement dark mode for header component
```

---

## 📅 Current Project Status

### **Week 0 (Nov 18-24, 2025): Foundation** ✅ 90% COMPLETE

**Completed Tasks:**
- [x] Project initialization (Next.js 15.0.3 + TypeScript)
- [x] Git repository setup and GitHub integration
- [x] Design system foundation (Tailwind CSS 4, shadcn/ui, dark mode, RTL)
- [x] Typography implementation (Noto Sans Arabic/English)
- [x] Logo component (6 variations)
- [x] Core UI components (ThemeProvider, ThemeToggle, LanguageSwitcher)
- [x] Internationalization setup (next-intl, ar.json, en.json)
- [x] Homepage structure (bilingual, responsive)
- [x] Documentation (PRD.md - 50+ pages)

**Blocked Tasks:**
- [ ] ⚠️ **CRITICAL BLOCKER:** next-intl routing issue
  - Routes build successfully but return 404 at runtime
  - Investigation shows Next.js 15/16 + next-intl 4.5.5 compatibility issue
  - **Resolution needed before Week 1**

**Time Invested:** ~12 hours
**Completion:** 90%
**Blockers:** 1 critical (routing)

---

## ✅ Completed Tasks Log

Track all completed tasks here with date, description, and relevant file changes.

### November 22, 2025

1. **Created Claude.md** - Project tracking and rules documentation
   - Added progress tracking rules
   - Defined development workflow
   - Created task completion log structure

2. **Updated README.md** - Professional project documentation
   - Added Engezna project overview
   - Included tech stack, features, and setup instructions
   - Added bilingual description (Arabic/English)

---

## 🚧 Known Issues & Blockers

### **Critical Issues**

1. **next-intl Routing (Week 0)** - BLOCKING WEEK 1
   - **Issue:** Routes build successfully but return 404 at runtime
   - **Impact:** Blocks all language switching and homepage loading
   - **Status:** Under investigation
   - **Options:**
     1. Deep debug with Next.js docs (1-2 days)
     2. Switch to client-side i18n (30 mins)
     3. Wait for next-intl update
   - **Decision:** To be made at Week 1 start

### **Minor Issues**

None currently.

---

## 📊 Weekly Progress Tracking

Use this section to track weekly progress and update completion percentages.

### Week 0 (Nov 18-24, 2025)
- **Status:** ✅ 95% Complete
- **Key Achievements:** Foundation, design system, i18n setup, comprehensive documentation (PRD, Claude.md, README)
- **Blockers:** next-intl routing
- **Next Steps:** Resolve routing or implement workaround

### Week 1-2 (Nov 25 - Dec 8, 2025)
- **Status:** 🔄 Not started
- **Planned Tasks:**
  - [ ] Fix routing issue
  - [ ] Supabase project setup
  - [ ] Database schema implementation
  - [ ] Authentication flow
  - [ ] Customer homepage UI
  - [ ] Restaurant listing page

---

## 🎨 Design System Reference

Quick reference for development consistency.

### **Colors**
- **Primary:** Deep Green `#06c769` (hsl(149, 94%, 40%))
- **Secondary:** Black `#000000`
- **Accent:** White `#FFFFFF`

### **Typography**
- **Arabic:** Noto Sans Arabic (Variable) - `font-noto-sans-arabic`
- **English:** Noto Sans (Variable) - `font-noto-sans`
- **Weights:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### **Component Library**
- **Base:** shadcn/ui (Radix UI)
- **Custom:** Logo, ThemeToggle, LanguageSwitcher
- **All components:** Dark mode + RTL support

---

## 🔗 Important Links

- **PRD:** `/PRD.md` - Complete product requirements (50+ pages)
- **GitHub:** https://github.com/Mosabragab/Engezna
- **Tech Docs:**
  - Next.js 15: https://nextjs.org/docs
  - Supabase: https://supabase.com/docs
  - Tailwind CSS 4: https://tailwindcss.com/docs
  - next-intl: https://next-intl-docs.vercel.app

---

## 💡 Tips for Claude

### **Before Starting Work**
1. Always read `PRD.md` for context
2. Check this file for recent updates and blockers
3. Review relevant code files before editing
4. Understand the user's intent fully before implementing

### **During Development**
1. Use TypeScript strict types
2. Test in both light and dark mode
3. Test with Arabic RTL layout
4. Verify responsive design (mobile, tablet, desktop)
5. Check ESLint - fix all warnings
6. Follow established code patterns

### **After Completing Tasks**
1. Update this file (Claude.md)
2. Update PRD.md progress
3. Run `npm run dev` to verify
4. Commit with conventional commit message
5. Push to feature branch

### **Communication**
- Be concise and clear in responses
- Explain technical decisions when needed
- Ask for clarification if requirements are ambiguous
- Suggest improvements proactively but don't over-engineer

---

## 🎯 Success Metrics

Track these as the project progresses:

### **Technical Metrics**
- [ ] Build success rate: 100%
- [ ] ESLint warnings: 0
- [ ] TypeScript errors: 0
- [ ] Lighthouse score: >90
- [ ] Load time: <2s

### **Development Metrics**
- [ ] Weekly velocity: Track tasks completed
- [ ] Blocker resolution time: <24 hours
- [ ] Code review iterations: <2 per PR

---

## 📝 Notes & Learnings

Document any important learnings, gotchas, or decisions here.

### **Technical Decisions**

1. **Next.js 15.0.3 over 16.0.3**
   - Downgraded due to routing compatibility issues
   - React 18.2.0 for stability
   - May upgrade when next-intl adds Next.js 16 support

2. **Supabase over Firebase**
   - Better PostgreSQL support
   - Built-in Row Level Security
   - More cost-effective at scale
   - Real-time capabilities

3. **Provider-Managed Delivery Model**
   - Ultra-low 5-7% commission possible
   - No driver app complexity
   - Providers use existing delivery staff
   - Key competitive advantage

---

## 🔄 Regular Maintenance Tasks

Tasks to perform regularly:

### **Daily**
- Check for critical errors
- Review any user feedback
- Update task progress

### **Weekly**
- Update progress percentages
- Review blockers and resolve
- Plan next week's tasks
- Update PRD.md roadmap

### **Monthly**
- Review and update PRD.md
- Evaluate tech stack performance
- Document major learnings
- Assess project velocity

---

**End of Claude.md**

*This file should be updated with every significant task completion. Keep it current!*
