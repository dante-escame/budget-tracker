# UI/UX Design Philosophy

This document outlines the core UI/UX principles that i folow for designing the pages of the application.

---

## 1. Core Interaction Principles

### Affordances and Signifiers
The interface must intuitively communicate its functionality.
*   **Signifiers:** We use visual cues like button press states, distinct active navigation highlights (using darker variations of the item color), and tooltips to explain purpose.
*   **Predictability:** Interactive elements behave consistently across the application.

### Feedback and State Management
Every user action triggers a visual response to confirm the system has acknowledged the input.
*   **Component States:** All interactive elements (buttons, links, inputs) support a minimum of four states: *Default*, *Hovered*, *Active/Pressed*, and *Disabled*.
*   **Critical Inputs:** Form fields include *Focus* states for clarity, *Error* states with red borders/messages for validation, and *Warning* states for non-blocking issues.
*   **System Status:** Use loading spinners for data fetching, success messages for completed actions, and micro-animations for transitions like scrolling or swiping.

### Micro-interactions
Beyond basic feedback, micro-interactions provide a polished feel. For instance, a "copy" action doesn't just change state; it triggers a temporary success chip that slides into view, providing unambiguous confirmation.

---

## 2. Layout and Structure

### Visual Hierarchy
Information is prioritized through strategic use of size, position, and color:
1.  **Primary Visual:** Icons or images lead the context.
2.  **Header:** The item name or title is bolded at the top.
3.  **Metadata:** Date and secondary info appear below the title in smaller, simpler text.
4.  **Key Figures:** Financial or primary numerical data is positioned to the right of the title, often using color for emphasis.
5.  **Supporting Details:** Additional info (e.g., location) uses icons to show relationships (like "from/to" connectors).
6.  **Actions:** Buttons and labels are consistently placed at the bottom of containers.

### Grids and Spacing
We adhere to a strict spatial system to maintain balance:
*   **The 12-Column Grid:** Used for highly structured pages (dashboards, lists) to ensure responsive alignment.
*   **The 8px/4px Rule:** Elements are spaced 8 pixels apart. For smaller, tighter components, we half this to a 4-point grid system.
*   **Breathability:** We prioritize whitespace. Standard gaps between major sections (titles, announcements) are 32px.
*   **Scaling:** When creating smaller variants of objects, we proportionally divide all gaps, font sizes, and line heights by two.

---

## 3. Visual Language

### Typography
The project utilizes a curated pool of humanist and modern sans-serif fonts: *DM Sans, Axiforma, SF Pro, Geist, Plus Jakarta Sans, Montserrat,* and *Unbounded*.
*   **Headings:** Letter spacing is tightened (-2% to -3%) and line height is reduced (110%-120%) for a more compact, modern look.
*   **Sizing (Dashboards/Structured):** H1 (24px) down to H6 (12px).
*   **Sizing (Landing/Simple):** H1 (64px) down to H6 (14px).

### Color Theory and Semantics
*   **Brand Alignment:** Design starts with a primary brand color, which is expanded into a full ramp (50-950) for backgrounds and text.
*   **Eye Guidance:** Color is used sparingly to guide focus (e.g., announcement bars, focus states, or status chips).
*   **Semantic Colors:**
    *   **Red:** Danger, Urgency, Attention.
    *   **Blue:** Trust, Information.
    *   **Yellow:** Warning, Caution.
    *   **Green:** Success, Positive Growth.

### Shadows and Depth
*   **Elevation:** Content that overlaps or "pops" uses stronger shadows.
*   **Opacity & Blur:** We prefer low-opacity shadows with high blur values for a soft, modern feel.
*   **Interactive Depth:** Hovered buttons and clickable objects utilize both inner and outer shadows to simulate physical interaction.

### Iconography
Icons are mandatory for scannability. To maintain visual harmony, icon sizes are matched to the line height of the adjacent text, with tightened text wrapping.

---

## 4. Component Patterns

### Buttons
*   **Ghost Buttons:** Sidebar links and secondary actions often start as "ghost" buttons (no background) until hovered.
*   **Padding:** Standard padding follows a 1:2 height-to-width ratio (e.g., 16px vertical, 32px horizontal).

### Overlays and Images
*   **Legibility:** When placing text over images, we apply linear gradients or progressive blurs to ensure high contrast without completely obscuring the background visual.

---

## 5. Variations

### Dark Mode
Dark mode is treated as a distinct experience rather than a simple color inversion:
*   **No Shadows:** Depth is created through layer luminosity (lighter cards on darker backgrounds) rather than drop shadows.
*   **Soft Contrast:** Borders are subtle to avoid visual fatigue.
*   **Deep Tones:** The palette favors deep purples, navy blues, and grays over pure black.
