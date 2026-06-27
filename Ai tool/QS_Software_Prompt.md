Build me a full-stack web application (React frontend) for structural steel and concrete quantity surveying. This is a professional engineering tool used in Bahrain for villa construction projects. The app should look modern, dark-themed, and work on both desktop and mobile.

=== PROJECT OVERVIEW ===

The tool calculates steel quantity (in kg and tons, broken down by bar diameter) and concrete volume (in m³) for a building project. The user uploads structural drawing schedules (or inputs them manually), then inputs quantities/running meters, and the tool calculates everything automatically.

The workflow is:
1. User creates a new project (enters project name, client name, location)
2. User inputs structural schedules (footing dimensions, column details, beam details, etc.) — OR uploads a PDF and the AI extracts them
3. User inputs quantities (how many F1 footings, running meters of beams, column counts per floor, slab areas)
4. Tool calculates all steel and concrete automatically using the engineering formulas below
5. Tool shows a grand summary with breakdown by section, by diameter, and total
6. User can export to Excel report

=== SECTIONS (in order) ===

The project is divided into these structural sections, calculated in this order:

1. FOOTING BOXES (isolated, combined, eccentric, lift footings)
2. STRIP/BOUNDARY FOOTINGS
3. GROUND BEAMS / FOOTING BEAMS
4. FOUNDATION COLUMNS
5. GROUND FLOOR COLUMNS
6. FIRST FLOOR COLUMNS
7. ROOF FLOOR COLUMNS
8. UPPER ROOF COLUMNS (optional)
9. RING BEAMS (per floor)
10. FLOOR BEAMS (per floor)
11. SLABS (grade slab, ground floor, first floor, roof)
12. BLINDING CONCRETE

=== DETAILED FORMULAS AND METHODS ===

--- GENERAL CONSTANTS (all editable by user via settings) ---
- Steel bar length: 12 meters standard
- kg/m values: Y8=0.395, T10=0.618, Y12=0.889, Y16=1.580, Y20=2.469, Y25=3.855, T32=6.313
- Alternative formula: kg/m = d² / 162 (where d = diameter in mm)
- Footing cover: 70mm each side (140mm total deducted from dimensions)
- Beam/column cover: 40mm each side (80mm total)
- Slab cover: 25mm
- Wastage: +10% on main bars/footing bars, +15% on stirrups
- Blinding concrete: user inputs m³ (default 30m³)
- Lap length for columns: 0.8m (added to floor height for steel calculation, NOT for concrete)

--- 1. FOOTING BOXES ---

Input per footing type: name (F1, F2, etc.), length(mm), width(mm), depth(mm), type (isolated/combined/eccentric/lift), bottom reinforcement along W (e.g. "Y16@150c/c"), bottom reinforcement along L, top reinforcement along W (if any), top reinforcement along L (if any), side face reinforcement (if any).

User then inputs: QUANTITY of each footing type.

Calculation method — bars are U-SHAPED (not straight):

For each direction:
- Straight portion = dimension - 2 × cover (dimension - 140mm for footings)
- B1 leg (first layer) = depth - 2 × cover = depth - 140mm
- B2 leg (second layer, perpendicular) = B1 leg - bar diameter (because B2 sits on top of B1)
- Total bar length = leg + straight + leg (round to nearest 0.1m)
- Number of bars = (perpendicular dimension - 2×cover) / spacing (round UP to next whole number)

Weight per bar type = total_bars × bar_length × kg_per_m × quantity × 1.10 (wastage)

Additional bars per footing:
- FB1: T10 starter/support bars, 2 per footing. Length ≈ straight portion + 2 × (depth + slab thickness). These are support bars, not main reinforcement.
- CH1: Chair bars (T12 or T16) for footings with TOP steel (combined, eccentric, lift). Cranked shape ~1,754mm. Quantity: 4-12 per footing depending on size.
  Rule: small footing (≤2m) = 4 chairs, medium (2-3m) = 6 chairs, large (3-4m) = 8 chairs, very large (>4m) = 10-12 chairs.
  Chair diameter: isolated = T10, eccentric = T12, combined = T16, large combined/lift = T16.

Concrete per footing = L × W × D (in meters) × quantity

Key rules:
- Isolated footings: bottom steel only (both ways)
- Eccentric footings: bottom AND top steel (both ways) + chair bars
- Combined footings: bottom AND top steel (both ways) + chair bars (T16)
- Lift footings: bottom AND top steel (both ways) + chair bars (T16)
- The schedule may have DIFFERENT spacings for Along W vs Along L — handle each separately
- The schedule may have DIFFERENT bar diameters for bottom vs top (e.g. bottom T16, top T12)

Leg size pattern by depth:
- 400mm depth → ~250mm B1 leg, ~230-240mm B2 leg
- 450mm depth → ~310mm B1, ~300mm B2
- 500mm depth → ~360mm B1, ~340mm B2
- 550mm depth → ~410mm B1, ~400mm B2
- 600mm depth → ~460mm B1, ~440-450mm B2
- 700mm depth → ~560mm B1, ~540mm B2

--- 2. STRIP / BOUNDARY FOOTINGS ---

Input: name, width(mm), depth(mm), bottom reinforcement, top reinforcement, type.
User inputs: RUNNING METERS.

Calculation:
- B1 (short bars across width): same U-bar method as footing boxes. Count = (running_length - 140) / spacing
- B2 (long bars along running length): count = (width - 140) / spacing. Each bar runs the full length.
- Top layer: same method if top steel specified.
- FB1: T10 support bars running full length, typically 4 bars.
- Apply +10% wastage on all.

Concrete = running_meters × width(m) × depth(m)

--- 3. GROUND BEAMS / FOOTING BEAMS ---

Input: name, width(mm), depth(mm), top bars (e.g. "4Y16"), bottom bars (e.g. "4Y16"), stirrup spec (e.g. "2L-Y8@150c/c" meaning 2 rings of Y8 at 150mm spacing).
User inputs: RUNNING METERS.

Calculation:
- Main bars: running_meters × number_of_bars × kg_per_m × 1.10 (wastage+laps)
- Stirrup cutting length = 2×(width - 2×cover) + 2×(depth - 2×cover) + hook_allowance
  Where cover = 40mm for beams, hook allowance = 160mm (for Y8: 20 × diameter)
- Number of stirrups = (running_meters / spacing) + 1
- Total stirrup weight = num_stirrups × rings × cutting_length × kg_per_m × 1.15 (wastage)

Concrete = width(m) × depth(m) × running_meters

--- 4-8. COLUMNS (per floor) ---

Input per column type: name, width(mm), depth(mm), vertical bars (e.g. "8-T25"), stirrup spec (e.g. "T8@150c/c"), number of stirrup rings (1, 2, or 3).

Per floor, user inputs: column HEIGHT, LAP LENGTH (0 for foundation, 0.8m for upper floors), and QUANTITY of each column type.

Note: C1 and PC1 may have same spec (treat as same type, just add quantities). Same for C2/PC2.

Calculation:
- Main bar steel height = floor_height + lap_length
- Main bar weight = num_bars × steel_height × quantity × kg_per_m × 1.10
- Stirrup cutting length = 2×(width - 2×40) + 2×(depth - 2×40) + 160mm hooks
- Number of stirrups per column = (floor_height_mm / stirrup_spacing) + 1
- Total stirrup weight = stirrups_per_column × rings × quantity × cutting_length × 0.395 × 1.15

Concrete per floor = width(m) × depth(m) × floor_height × quantity
NOTE: Foundation columns have NO concrete line item (concrete is part of foundation)
NOTE: Use actual floor height for concrete (NOT steel height with lap)

--- 9. RING BEAMS ---

Same method as ground beams / floor beams. User inputs running meters per floor.
Typical ring beam: 200×500mm or 250×500mm with continuous main bars + stirrups.

--- 10. FLOOR BEAMS ---

Same method as ground beams. Different beam types may exist per floor (B1, B2, B3, Z-beam, CA1, etc.).
User inputs running meters per beam type per floor.

For beams with different top/bottom bar DIAMETERS (e.g. B3: 4Y20 top + 6Y20 bottom), calculate each diameter separately.

--- 11. SLABS ---

Input per slab: name, area (sqm), concrete thickness.
Slab steel method (FIXED formula, editable in settings):
- 1st layer: Y10 @ 250mm c/c over FULL area, both directions
  - Bars per meter = 1000/250 = 4
  - Both directions = 4 + 4 = 8 running meters per sqm
  - Weight = area × 8 × 0.618 kg/m × 1.10 (wastage)
  
- 2nd layer: Y12 @ 200mm c/c over HALF the area, both directions
  - Bars per meter = 1000/200 = 5
  - Both directions = 5 + 5 = 10 running meters per sqm
  - Weight = (area/2) × 10 × 0.889 kg/m × 1.10 (wastage)

Grade slab: CONCRETE ONLY (area × thickness). No rebar calculation. Optionally note BRC mesh quantity.

--- 12. BLINDING CONCRETE ---
User inputs cubic meters directly. Default 30m³. No steel.

=== UI/UX REQUIREMENTS ===

1. DARK THEME — Professional dark UI with accent colors (gold/amber for concrete values, blue/cyan for steel values, green for totals).

2. PROJECT SETUP — First screen: project name, client, location, date. Saved to local storage.

3. NAVIGATION — Tab-based navigation between sections. Each section is a separate tab/page:
   - Footing Boxes
   - Strip Footings
   - Ground Beams
   - Columns (sub-tabs per floor)
   - Ring Beams
   - Floor Beams (sub-tabs per floor)
   - Slabs
   - Summary

4. SCHEDULE INPUT — For each section, show a table where user can add member types:
   - "Add Member" button opens a form with all relevant fields
   - Show the schedule as a clean table with all extracted details
   - Each row has a QUANTITY input field (number input with +/- buttons)
   - For beams/strips: quantity field is "Running Meters" input
   - For slabs: quantity field is "Area (sqm)" input

5. LIVE CALCULATION — As soon as quantity is entered, show calculated results INSTANTLY:
   - Steel weight per member (broken down by diameter)
   - Concrete volume per member
   - Section total at bottom

6. FORMULA VISIBILITY — Each section has a "⚙ Show Formulas" toggle button that reveals:
   - The exact formula being used (e.g. "Straight = 1200 - 140 = 1060mm")
   - All parameters (cover, wastage %, spacing, bar dia, leg calculations)
   - All parameters should be EDITABLE inline — if user changes cover from 70 to 75, everything recalculates
   - Show the formula panel as a collapsible card below the results

7. SETTINGS PANEL — Global settings accessible from any page:
   - Cover values (footing, beam, column, slab)
   - Wastage percentages (main bars, stirrups)
   - Lap length
   - Bar length (12m default)
   - kg/m values per diameter
   - Slab steel spec (1st layer dia/spacing, 2nd layer dia/spacing, 2nd layer coverage %)

8. SUMMARY DASHBOARD — Final tab showing:
   - Grand total table: rows = sections, columns = Y8, T10, Y12, Y16, Y20, T25, T32, Total kg, Tons, Concrete m³
   - Steel breakdown by diameter (with percentage bars)
   - Total steel in tons
   - Total concrete in m³
   - Steel ratio (kg/m³)

9. EXPORT — "Export to Excel" button that generates a formatted .xlsx file with:
   - Separate sheet per section with full calculation details
   - Grand summary sheet matching the dashboard
   - Professional formatting (colored headers, borders, number formatting)

10. SAVE/LOAD — Save project data to browser localStorage. Multiple projects supported.

11. PDF UPLOAD (optional feature) — "Upload Schedule" button that:
    - Accepts PDF files
    - Converts pages to images
    - Sends to Claude API for schedule extraction
    - Auto-populates the schedule tables
    - User still inputs quantities manually

=== TECH STACK ===
- React (functional components, hooks)
- Tailwind CSS for styling
- xlsx library (SheetJS) for Excel export
- localStorage for persistence
- No backend needed — all calculations client-side
- Claude API integration for PDF reading (optional)

=== IMPORTANT ENGINEERING RULES ===
- Footing bars are ALWAYS U-shaped (leg + straight + leg), NEVER straight
- B2 leg is always smaller than B1 leg by one bar diameter
- Combined/eccentric footings always need chair bars (CH1)
- Foundation columns: NO lap added, NO concrete calculated
- Upper floor columns: ALWAYS add lap to steel height, use actual height for concrete
- Stirrup cover is 40mm (not 70mm like footings)
- Slab 2nd layer is always HALF the area
- All weights should show with +10% or +15% wastage already applied
- Never mix up "along W" and "along L" — they have different bar lengths and counts
- Ring beams count toward the floor ABOVE (ground floor top ring beam = on top of ground floor columns)

=== SAMPLE DATA FOR TESTING ===
Pre-load one sample footing for testing:
F1: 1800×1600×400, Y16@200c/c bottom both ways, Isolated, Quantity=3
Expected: B1 length=2180→2.2m, B1 count=8 per footing, B2 length=1940→1.9m, B2 count=9 per footing
Total steel ≈ 177 kg (with wastage)
Concrete = 1.8×1.6×0.4×3 = 3.456 m³
