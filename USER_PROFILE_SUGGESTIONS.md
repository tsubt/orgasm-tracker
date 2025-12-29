# User Profile Page Redesign Suggestions

## Overview

Transform the user profile page into a social media-style profile that's consistent with platforms like Twitter/X, Instagram, or Mastodon, but adapted for orgasm tracking context.

## Layout Structure

### 1. Profile Header Section

**Position**: Top of page, full width

**Components**:

- **Profile Banner/Header Image** (optional)

  - Subtle gradient or pattern background
  - Could use a color based on user's most common orgasm type

- **Profile Information Card**
  - **Username** (large, prominent)
    - Display: `@username` format
    - Font size: 2xl-3xl, bold
  - **Join Date**
    - Format: "Joined [Month] [Year]"
    - Example: "Joined January 2024"
    - Smaller text, muted color
  - **User Bio/Description** (optional field)
    - Allow users to add a short bio
    - Max 160 characters
    - Display below username

### 2. Stats Overview Section

**Position**: Below profile header, in a card/grid layout

**Display Format**: Similar to Twitter profile stats (Following/Followers/Posts)

**Stats to Show**:

- **Total Orgasms Tracked**

  - Large number, prominent
  - Label: "Total"
  - Format: "1,234 orgasms"

- **This Year**

  - Current year count
  - Label: "2025" (or current year)
  - Format: "234 this year"

- **This Month**

  - Current month count
  - Label: "This Month"
  - Format: "45 this month"

- **This Week**
  - Current week count
  - Label: "This Week"
  - Format: "12 this week"

**Visual Design**:

- Grid layout: 2x2 or 4 columns on desktop
- Each stat in a card with:
  - Large number (text-3xl or text-4xl)
  - Smaller label text
  - Subtle background or border
  - Hover effect for interactivity

### 3. Activity Feed Section

**Position**: Below stats, full width

**Feed Structure**:

- Reverse chronological order (newest first)
- Each entry represents an orgasm event
- Infinite scroll or pagination

**Feed Item Design** (similar to social media posts):

```
┌─────────────────────────────────────────┐
│ [Date] [Time]                          │
│                                         │
│ Type: [FULL/RUINED/HANDSFREE/ANAL]     │
│ Partner: [SOLO/VIRTUAL/PHYSICAL]       │
│                                         │
│ [Note text if present]                  │
│                                         │
│ ─────────────────────────────────────  │
└─────────────────────────────────────────┘
```

**Feed Item Components**:

1. **Header**

   - Date and time
   - Format: "January 15, 2025 at 3:45 PM"
   - Or relative: "2 hours ago", "Yesterday", "3 days ago"
   - Muted text color

2. **Type Badge**

   - Colored badge/chip matching the type colors
   - FULL: Red (#EF4444)
   - RUINED: Purple (#A855F7)
   - HANDSFREE: Cyan (#06B6D4)
   - ANAL: Green (#22C55E)
   - Small, rounded pill shape

3. **Partner Badge**

   - Secondary badge for partner type
   - SOLO/VIRTUAL/PHYSICAL
   - Different style (outline or muted)

4. **Note Content** (if present)

   - Display full note text
   - Styled like a post body
   - Support line breaks
   - Optional: character limit with "Show more" for long notes

5. **Visual Separator**
   - Subtle border or divider between entries
   - Light gray line

**Feed Item Styling**:

- Card-based design with:
  - White/dark background (theme-aware)
  - Padding: p-4 or p-6
  - Rounded corners
  - Subtle shadow or border
  - Hover effect (slight elevation or color change)

### 4. Empty States

**No Orgasms**:

- Friendly message: "No orgasms tracked yet"
- Optional: Encouragement to start tracking

**Private Profile**:

- Show profile header with username
- Message: "This user's orgasms are private"
- Still show join date and basic stats if allowed

## Visual Design Guidelines

### Color Scheme

- Use existing app color palette
- Primary accent: Pink (#EC4899 / #DB2777)
- Type colors: Match Fapped summary colors
- Background: Light gray-100 / Dark gray-800
- Text: High contrast for readability

### Typography

- Username: Bold, large (text-2xl to text-3xl)
- Stats numbers: Extra large (text-4xl to text-5xl)
- Labels: Small, muted (text-sm, text-gray-500)
- Feed dates: Small, muted
- Notes: Regular body text

### Spacing

- Consistent padding: p-4, p-6, p-8
- Gap between sections: gap-6, gap-8
- Feed item spacing: gap-4

### Responsive Design

- Mobile: Single column, stacked stats
- Tablet: 2-column stats grid
- Desktop: 4-column stats, wider feed

## Implementation Details

### Data Fetching

- Fetch user info (username, join date, publicProfile flag)
- Fetch orgasms (if publicOrgasms is true)
- Calculate stats:
  - Total count
  - Year count (current year)
  - Month count (current month)
  - Week count (current week)
- Sort orgasms by timestamp DESC for feed

### Performance

- Paginate feed (e.g., 20 items per page)
- Use infinite scroll or "Load More" button
- Lazy load feed items if needed

### Privacy

- Only show orgasms if `publicOrgasms` is true
- Respect `publicProfile` setting
- Show appropriate empty states

## Example Layout

```
┌─────────────────────────────────────────────┐
│          [Profile Banner/Header]            │
│                                             │
│         @username                           │
│         Joined January 2024                 │
│         [Optional Bio Text]                 │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐   │
│  │ 1,234│  │ 234  │  │  45  │  │  12  │   │
│  │Total │  │2025  │  │Month │  │ Week │   │
│  └──────┘  └──────┘  └──────┘  └──────┘   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Feed                                      │
├─────────────────────────────────────────────┤
│ Jan 15, 2025 at 3:45 PM                   │
│ [FULL] [PHYSICAL]                          │
│                                            │
│ Had a great session today!                 │
├─────────────────────────────────────────────┤
│ Jan 14, 2025 at 8:30 PM                   │
│ [RUINED] [SOLO]                            │
│                                            │
├─────────────────────────────────────────────┤
│ Jan 13, 2025 at 2:15 PM                   │
│ [HANDSFREE] [VIRTUAL]                       │
│                                            │
│ Experimenting with new techniques...       │
└─────────────────────────────────────────────┘
```

## Additional Features (Optional)

1. **Filter Feed**

   - Filter by type (FULL, RUINED, etc.)
   - Filter by partner (SOLO, VIRTUAL, PHYSICAL)
   - Filter by date range

2. **Search Feed**

   - Search notes text
   - Search by date

3. **Export/Share**

   - Share profile link
   - Export feed as CSV/JSON

4. **Activity Graph**

   - Small chart showing activity over time
   - Could be a mini heatmap or line chart

5. **Achievements/Badges**
   - Milestone badges (e.g., "100 orgasms", "1 year tracking")
   - Display in profile header
