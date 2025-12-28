# Detailed Plot Descriptions for JavaScript Recreation

This document describes the 6 plots created by the `generate_plots` function. Each plot uses a dark theme with specific color schemes and styling.

## Common Theme Properties (All Plots)

- **Background color**: `#1c1c1c` (dark gray/black)
- **Text color**: `#e9e9e9` (light gray/white)
- **Axis text color**: `#c9c9c9` (medium gray)
- **Grid lines**: None (panel.grid = element_blank())
- **Theme style**: Minimal

---

## Plot 1: p_main - Main Bar Chart

**Type**: Horizontal bar chart (bars extend rightward)

**Data Structure**:

- X-axis: Count of orgasms (numeric, horizontal position)
- Y-axis: Type of orgasm (categorical, vertical position)
- Fill color: Sex category (SOLO, VIRTUAL, PHYSICAL)

**Type Categories** (ordered):

1. FULL
2. RUINED
3. HANDSFREE
4. ANAL

**Sex Categories** (ordered):

1. SOLO
2. VIRTUAL
3. PHYSICAL

**Visual Elements**:

- Horizontal bars grouped by type, with stacked or grouped segments by sex
- Text labels showing count values positioned to the right of each bar segment (hjust = -0.1, size = 3.5)
- Text color: `#c9c9c9`
- Fill colors: Uses scico palette "buda" with 3 colors (one for each sex category)
- X-axis limits: 0 to maximum count across all types
- No legend displayed

**Title**: "I had {n} orgasms in {year}" where n is the total number of rows in the dataset

**Axes**:

- X-axis: No label (empty string)
- Y-axis: No label (empty string)

---

## Plot 2: p_nday - Number Per Day Bar Chart

**Type**: Vertical bar chart (bars extend upward)

**Data Structure**:

- X-axis: Individual days (implicit, one bar per day)
- Y-axis: Number of orgasms per day (numeric)
- Fill color: Sex category (SOLO, VIRTUAL, PHYSICAL)

**Data Aggregation**:

- Group by: year, month, day, sex
- Count: Number of orgasms per day per sex category
- Bars are stacked by sex category

**Visual Elements**:

- Vertical bars, one per day in the year
- Bars are stacked segments colored by sex category
- Fill colors: Uses scico palette "buda" with 3 colors (same as p_main)
- Legend: Positioned on the right side, showing sex categories

**Title**: "The most was {max_per_day} in a day" where max_per_day is the maximum count across all days

**Axes**:

- X-axis: No label (empty string)
- Y-axis: "Number in a day"
- Legend label: Empty string (fill = "")

---

## Plot 3: p_delay - Time Between Orgasms Histogram

**Type**: Histogram

**Data Structure**:

- X-axis: Logarithm of time between orgasms (in days)
- Y-axis: Frequency/count (numeric)

**Data Transformation**:

1. Sort data by date (ascending)
2. Calculate time_between: difference in seconds between consecutive orgasms (first value is NA)
3. Convert to days: time_between / 60 / 60 / 24
4. Take natural logarithm: log(time_between_days)
5. Filter out NA values

**Visual Elements**:

- Histogram bars with fill color: `pink` (or `#FFC0CB`)
- X-axis uses custom breaks and labels:
  - Breaks (in log days): log(5/60/24), log(1/24), log(3/24), log(8/24), log(1), log(3), log(10)
  - Labels: "5m", "1h", "3h", "8h", "1d", "3d", "10d"
- No grid lines

**Title**: "The longest time between was {n} days" where n is the maximum time_between in days (rounded)

**Axes**:

- X-axis: "Time between orgasms"
- Y-axis: No label (empty string)

---

## Plot 4: p_week - Day of Week vs Hour Heatmap

**Type**: 2D binned heatmap (hexbin or rectangular bins)

**Data Structure**:

- X-axis: Day of week (categorical)
- Y-axis: Hour of day (numeric, 0-24)
- Fill color: Frequency/count (numeric, darker = more frequent)

**Day of Week Categories** (ordered):

1. Mon
2. Tue
3. Wed
4. Thu
5. Fri
6. Sat
7. Sun

**Hour Range**: 0 to 24

**Data Aggregation**:

- Bin width: 3 (for both dimensions, though this may apply differently to categorical vs numeric)
- For numeric hour axis, binwidth = 3 means bins of 3 hours
- Count occurrences in each bin

**Visual Elements**:

- 2D binned heatmap showing frequency
- Fill color scale: scico palette "acton", direction = 1, begin = 0.2 (darker colors for higher counts)
- Y-axis breaks: 0, 3, 6, 9, 12, 15, 18, 21, 24 (every 3 hours)

**Time Period Categories** (for subtitle calculation):

- 0-5: "Night time"
- 6-8: "Early morning"
- 9-11: "Late morning"
- 12-17: "Afternoon"
- 18-20: "Early evening"
- 21-22: "Late evening"
- 23: "Bedtime"

**Title Calculation**:

- Find most common time period by aggregating counts by hour bin (y coordinate)
- Title: "Most common time of day: {most_common_time}"
- Find peak bin (highest count) and map to day and time period
- Subtitle: "Peak was {day} {time_period}"

**Axes**:

- X-axis: No label (empty string)
- Y-axis: "Time"
- Legend label: "Frequency"

---

## Plot 5: p_commit_freq - GitHub-Style Commit Frequency Heatmap

**Type**: Tile/heatmap (rectangular grid)

**Data Structure**:

- X-axis: Week number (numeric, 0-52/53)
- Y-axis: Day of week (categorical)
- Fill color: Count/frequency (numeric)

**Data Aggregation**:

- Group by: week, dow (day of week)
- Count: Number of orgasms per week-day combination

**Day of Week Categories** (ordered, same as p_week):

1. Mon
2. Tue
3. Wed
4. Thu
5. Fri
6. Sat
7. Sun

**Visual Elements**:

- Rectangular tiles, one per week-day combination
- Tile border: black, linewidth = 1
- Fill color gradient:
  - Low (few occurrences): `#510258` (dark purple)
  - High (many occurrences): `#EA69F6` (bright pink/magenta)
- Aspect ratio: 1:1 (coord_equal, square tiles)
- X-axis breaks: Week numbers corresponding to the first of each month
- X-axis labels: Month abbreviations (Jan, Feb, Mar, etc.)
- No legend

**Title**: "Commit frequency"

**Axes**:

- X-axis: "Month"
- Y-axis: "Day of week"

---

## Plot 6: p_timeline - Timeline Vertical Lines

**Type**: Vertical line plot (timeline)

**Data Structure**:

- X-axis: Date/timestamp (continuous, POSIXct)
- Y-axis: Not used (implicit)
- Color: Type of orgasm (categorical)
- Facet: Sex category (vertical facets)

**Type Categories** (ordered, same as p_main):

1. FULL
2. RUINED
3. HANDSFREE
4. ANAL

**Sex Categories** (ordered, same as p_main):

1. SOLO
2. VIRTUAL
3. PHYSICAL

**Visual Elements**:

- Vertical lines (geom_vline) at each orgasm timestamp
- Line width: 0.8
- Color: Type of orgasm, using scico palette "roma", direction = 1
- Faceted vertically by sex (one row per sex category)
- X-axis breaks: First day of each month (as POSIXct timestamps converted to integers)
- X-axis labels: Month abbreviations (Jan, Feb, Mar, etc.)
- X-axis expansion: c(0, 0) (no padding)
- X-axis text justification: hjust = 0 (left-aligned)
- No grid lines

**Title**: Empty string (glue::glue(""))

**Axes**:

- X-axis: No label (empty string)
- Y-axis: No label (empty string)
- Legend label: "Frequency" (though legend position is commented out)

---

## Data Processing Notes

**Date/Time Fields Extracted**:

- `date`: POSIXct timestamp in UTC
- `year`: Numeric year
- `month`: Factor 1-12 labeled as month abbreviations (Jan-Dec)
- `day`: Numeric day of month (1-31)
- `dow`: Factor 1-7 labeled as day abbreviations (Mon-Sun)
- `week`: Numeric week number (0-52/53, using %U format)
- `hour`: Numeric hour (0-23)
- `minute`: Numeric minute (0-59)

**Type Factor Levels**:

- FULL, RUINED, HANDSFREE, ANAL

**Sex Factor Levels**:

- SOLO, VIRTUAL, PHYSICAL

**Color Palettes**:

- scico "roma": Used for type categories in timeline (4 colors)
- scico "buda": Used for sex categories in bar charts (3 colors)
- scico "acton": Used for frequency heatmap in p_week (continuous scale, begin = 0.2)
- Custom gradient: `#510258` to `#EA69F6` for commit frequency heatmap
- Pink: `pink` or `#FFC0CB` for histogram and smooth line

---

## Layout Structure

The plots are combined using a patchwork layout with the following design:

```
ABD
EED
EEC
FFF
```

Where:

- A = p_main
- B = p_nday
- C = p_delay
- D = p_week
- E = p_commit_freq
- F = p_timeline

This creates a grid where:

- Row 1: p_main (left), p_nday (middle), p_week (right)
- Row 2: p_commit_freq (spans left and middle), p_week continues (right)
- Row 3: p_commit_freq continues (spans left and middle), p_delay (right)
- Row 4: p_timeline (spans full width)
