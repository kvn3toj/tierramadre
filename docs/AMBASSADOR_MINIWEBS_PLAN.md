# Ambassador Mini-Webs Implementation Plan

> **Project**: Tierra Madre Studio - Ambassador Profile System
> **Architect**: Rachel (Trust Architecture Agent)
> **Version**: 1.0
> **Created**: 2025-11-29

---

## Executive Summary

Create customizable mini-websites for Tierra Madre ambassadors (asesores) that allow them to showcase their personal brand or use the official TM Studio template. This system builds seller trust through verified credentials, customer reviews, and performance metrics.

**Key Distinction**:
- **Product Certification** (already implemented): Evaluates THE EMERALD's authenticity
- **Ambassador Trust Score** (this feature): Evaluates THE SELLER's reputation

---

## Architecture Overview

```
AMBASSADOR MINI-WEB SYSTEM
==========================

                    ┌─────────────────────────┐
                    │   Template Engine       │
                    │  ┌──────┐  ┌──────────┐│
                    │  │ TM   │  │ Self-    ││
                    │  │Official│ │ Brand   ││
                    │  └──────┘  └──────────┘│
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼───────┐      ┌───────▼───────┐      ┌───────▼───────┐
│  Profile      │      │  Trust        │      │  Portfolio    │
│  Manager      │      │  Engine       │      │  System       │
│               │      │               │      │               │
│ - Bio         │      │ - Score Calc  │      │ - Gallery     │
│ - Contact     │      │ - Badges      │      │ - Testimonials│
│ - Specialties │      │ - Metrics     │      │ - Sales History│
└───────────────┘      └───────────────┘      └───────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Current)
**Status**: In Progress
**Agent Lead**: Cronos (Backend)

| Task | Status | Files Created |
|------|--------|---------------|
| TypeScript interfaces | Done | `src/types/ambassador.ts` |
| Trust calculation utils | Done | `src/utils/ambassadorTrust.ts` |
| Data storage schema | Pending | `src/data/ambassadors.ts` |
| Basic profile CRUD | Pending | Components |

### Phase 2: UI Components
**Status**: Pending
**Agent Lead**: Aria (Frontend/UX)

| Component | Description | Priority |
|-----------|-------------|----------|
| `AmbassadorCard` | Card view for directory listing | P0 |
| `AmbassadorProfile` | Full profile page | P0 |
| `AmbassadorTrustBadge` | Trust score visualization | P0 |
| `ProfileEditor` | Form for profile management | P1 |
| `TemplateSelector` | Switch between templates | P1 |
| `PortfolioGallery` | Showcase past work | P2 |
| `TestimonialList` | Customer reviews display | P2 |

### Phase 3: Trust System
**Status**: Pending
**Agent Lead**: Rachel (Trust Architecture)

| Feature | Description | Formula |
|---------|-------------|---------|
| Transaction Score | Sales volume & consistency | 25% weight |
| Satisfaction Score | Customer ratings | 30% weight |
| Response Score | Communication speed | 15% weight |
| Expertise Score | Certifications & skills | 10% weight |
| Authenticity Score | Certified products sold | 15% weight |
| Reliability Score | Dispute resolution | 5% weight |

### Phase 4: Template System
**Status**: Pending
**Agent Lead**: Eunoia (Visual Design)

| Template | Features | Customization |
|----------|----------|---------------|
| TM Official | Emerald branding, consistent | Accent color only |
| Self-Brand | Full customization | Colors, layout, logo |

### Phase 5: Integration
**Status**: Pending
**Agent Lead**: Hermes (Integration)

| Integration | Description |
|-------------|-------------|
| Inventory Link | Ambassador's active listings |
| Sales History | Transaction records |
| Analytics | Profile performance metrics |
| WhatsApp | Direct contact integration |

---

## Agent Task Assignments - Wave 2

### Aria (UX/UI Implementation)
```
Priority: HIGH
Tasks:
1. Create AmbassadorCard component
   - Compact card for directory view
   - Shows photo, name, trust badge, specialties

2. Create AmbassadorProfile page component
   - Full-page profile layout
   - Modular sections (about, portfolio, reviews)
   - Responsive design (mobile-first)

3. Create ProfileEditor component
   - Form for editing profile info
   - Image upload for photo/banner
   - Preview mode

4. Implement TM Official template
   - Emerald green color scheme
   - Professional layout
   - TM branding elements
```

### Kira (VX Writing)
```
Priority: MEDIUM
Tasks:
1. Write microcopy for profile sections
   - Placeholder text
   - Help tooltips
   - Empty states

2. Create ambassador onboarding flow copy
   - Welcome messages
   - Setup wizard text
   - Completion celebration

3. Write trust badge descriptions
   - Clear explanations
   - Earning criteria
   - Motivational prompts
```

### Moksart (UX Strategy)
```
Priority: MEDIUM
Tasks:
1. Design ambassador directory UX
   - Filter/search patterns
   - Sort by trust score
   - Category navigation

2. Plan gamification elements
   - Badge progress tracking
   - Trust score milestones
   - Leaderboard mechanics

3. Optimize profile conversion funnel
   - Contact form placement
   - Trust signals positioning
   - Call-to-action optimization
```

### Cronos (Backend)
```
Priority: HIGH
Tasks:
1. Create data persistence layer
   - LocalStorage schema
   - CRUD operations
   - Data validation

2. Implement trust score recalculation
   - Scheduled updates
   - Real-time triggers
   - Cache management

3. Build mock data generator
   - Sample ambassadors
   - Test testimonials
   - Seed inventory links
```

### Rachel (Trust Architecture)
```
Priority: ONGOING
Tasks:
1. Refine trust score algorithm
   - Weight adjustments
   - Edge case handling
   - New ambassador fairness

2. Design dispute resolution flow
   - Claim process
   - Evidence collection
   - Resolution paths

3. Plan verification tiers
   - Identity verification
   - Professional certification
   - Premium status criteria
```

---

## Data Model Summary

### AmbassadorProfile
```typescript
{
  id: string
  slug: string           // URL: /ambassador/maria-esmeraldas
  displayName: string
  tagline: string
  bio: string
  photoUrl: string
  bannerUrl?: string

  contactMethods: ContactMethod[]
  socialLinks: SocialLink[]
  location: Location
  languages: Language[]

  specialties: Specialty[]
  priceRange: PriceRange
  expertise: ExpertiseArea[]
  certifications: Certification[]

  template: TemplateConfig
  trustScore?: TrustScore
  reputation?: ReputationMetrics

  status: 'active' | 'inactive' | 'suspended'
  verificationStatus: VerificationLevel
}
```

### Trust Score Components
```typescript
{
  overall: number           // 0-100
  components: {
    transactionHistory: number
    customerSatisfaction: number
    responseTime: number
    expertise: number
    authenticity: number
    reliability: number
  }
  confidence: number        // 0-1
}
```

### Trust Levels
| Score | Level | Color | Description |
|-------|-------|-------|-------------|
| 90+ | Elite | Gold | Top performers |
| 75-89 | Trusted | Emerald | Established sellers |
| 50-74 | Established | Blue | Growing reputation |
| 0-49 | Newcomer | Gray | Building trust |

---

## File Structure

```
src/
├── types/
│   └── ambassador.ts          # [DONE] TypeScript interfaces
│
├── utils/
│   └── ambassadorTrust.ts     # [DONE] Trust calculations
│
├── data/
│   └── ambassadors.ts         # [TODO] Sample data & storage
│
├── components/
│   └── ambassador/
│       ├── AmbassadorCard.tsx         # [TODO] Directory card
│       ├── AmbassadorProfile.tsx      # [TODO] Full profile
│       ├── AmbassadorTrustBadge.tsx   # [TODO] Trust display
│       ├── ProfileEditor.tsx          # [TODO] Edit form
│       ├── TemplateSelector.tsx       # [TODO] Template picker
│       ├── PortfolioGallery.tsx       # [TODO] Work showcase
│       ├── TestimonialList.tsx        # [TODO] Reviews
│       └── AmbassadorDashboard.tsx    # [TODO] Management UI
│
├── templates/
│   └── ambassador/
│       ├── TMOfficialTemplate.tsx     # [TODO] Branded template
│       └── SelfBrandTemplate.tsx      # [TODO] Custom template
│
└── pages/
    ├── AmbassadorDirectory.tsx        # [TODO] List all ambassadors
    └── AmbassadorPage.tsx             # [TODO] Public profile page
```

---

## Success Metrics

### Adoption Metrics
- % of active sellers with profiles
- Profile completion rate
- Template choice distribution (TM vs Self-Brand)

### Trust Metrics
- Average trust score across platform
- Badge earning rate
- Trust score improvement velocity

### Business Metrics
- Profile views → inquiry conversion
- Average order value by trust level
- Customer return rate to same ambassador

---

## Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Foundation | Types, utils, storage |
| 2 | Core UI | Card, Profile, Badge components |
| 3 | Editor | ProfileEditor, TemplateSelector |
| 4 | Trust | Full trust engine, badges |
| 5 | Portfolio | Gallery, testimonials |
| 6 | Integration | Inventory link, analytics |
| 7 | Polish | Testing, optimization |
| 8 | Launch | Production deployment |

---

## Notes

### Trust Philosophy
> "Trust is the currency of relationships. Make it visible, make it earnable, make it matter."
> — Rachel, Trust Architect

### Key Principles
1. **Transparency**: Users see HOW trust scores are calculated
2. **Multi-dimensional**: No single metric dominates
3. **Earned, Not Bought**: Can't game the system with volume alone
4. **Confidence-Aware**: New ambassadors aren't penalized, but uncertainty is shown
5. **Reputation Mobility**: Bad actors can't hide, good actors can recover

---

## Next Steps

1. Complete Phase 1 remaining tasks
2. Invoke Aria for UI components
3. Create sample ambassador data
4. Build directory page
5. Implement profile editor

---

*Document generated by Rachel's Trust Architecture System*
*Part of the CoomUnity Agent Ecosystem*
