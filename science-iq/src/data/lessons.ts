import type { Subject } from '../lib/types';

export interface Lesson {
  id: string;
  subject: Subject;
  topic: string; // matches question-bank topic, so the knowledge check and "practise" link work
  title: string;
  intro: string;
  principle: string;
  definitions: [string, string][];
  formulas: [string, string][];
  examples: string[];
  misconceptions: string[];
  worked: { q: string; steps: string[] }[];
}

export const LESSONS: Lesson[] = [
  // ------------------------------------------------------------------ PHYSICS
  {
    id: 'motion', subject: 'Physics', topic: 'Motion', title: 'Describing Motion',
    intro: 'Motion is change of position with time. To describe it fully we need to know how far, in which direction and how quickly that changes.',
    principle: 'Displacement and velocity are vectors (they have direction); distance and speed are scalars. Acceleration is the rate of change of velocity — a change in speed OR direction. For constant acceleration, three equations link u, v, a, s and t.',
    definitions: [['Displacement', 'Shortest straight-line change in position, with direction.'], ['Average velocity', 'Displacement ÷ time.'], ['Acceleration', 'Change in velocity ÷ time taken (m/s²).'], ['Uniform circular motion', 'Constant speed on a circle — velocity changes because direction changes, so it is accelerated.']],
    formulas: [['v = u + at', 'velocity after time t'], ['s = ut + ½at²', 'displacement after time t'], ['v² = u² + 2as', 'links speed and distance without time'], ['Slope of x–t graph = velocity', 'Area under v–t graph = displacement']],
    examples: ['A car going round a roundabout at a steady 30 km/h is accelerating.', 'A runner completing one lap of a 400 m track has run 400 m but has zero displacement.', 'Braking distance grows with the square of speed: double the speed → four times the distance.'],
    misconceptions: ['“Zero velocity means zero acceleration.” A ball at the top of its flight has v = 0 but a = g downward.', '“Negative acceleration always means slowing down.” It means acceleration opposite to the chosen positive direction; an object moving in the negative direction and speeding up also has negative acceleration.'],
    worked: [
      { q: 'A train starts from rest and reaches 20 m/s in 40 s. How far does it travel?', steps: ['a = (20 − 0)/40 = 0.5 m/s²', 's = ut + ½at² = 0 + ½ × 0.5 × 40² = 400 m', 'Check with average velocity: (0 + 20)/2 × 40 = 400 m ✓'] },
      { q: 'A car moving at 30 m/s brakes at 6 m/s². Find the stopping distance.', steps: ['v² = u² + 2as → 0 = 900 − 12s', 's = 75 m'] },
    ],
  },
  {
    id: 'newton', subject: 'Physics', topic: "Force & Newton's Laws", title: "Force and Newton's Laws",
    intro: 'Forces change the state of motion of objects. Newton’s three laws explain when, how and why motion changes.',
    principle: 'First law: without a net force, velocity stays constant (inertia). Second law: net force = rate of change of momentum, F = ma. Third law: forces come in equal and opposite pairs acting on DIFFERENT bodies.',
    definitions: [['Inertia', 'Resistance of a body to change in its state of motion; measured by mass.'], ['Momentum', 'p = mv, a vector (kg m/s).'], ['Impulse', 'Force × time = change in momentum.'], ['Net force', 'Vector sum of all forces on a body.']],
    formulas: [['F = ma', 'net force and acceleration'], ['F = Δp / Δt', 'general form of the second law'], ['m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂', 'conservation of momentum (no external force)']],
    examples: ['A cricketer pulls the hands back while catching to increase the time and reduce the force.', 'A rocket pushes gas backwards; the gas pushes the rocket forwards — no air needed.', 'Passengers lurch forward when a bus brakes suddenly (inertia of motion).'],
    misconceptions: ['“A moving object needs a force to keep moving.” Only friction makes it seem so; with no net force it moves on at constant velocity.', '“Action and reaction cancel.” They act on different bodies, so they cannot cancel each other.'],
    worked: [
      { q: 'A 1200 kg car accelerates from 10 m/s to 25 m/s in 5 s. Find the net force.', steps: ['a = (25 − 10)/5 = 3 m/s²', 'F = ma = 1200 × 3 = 3600 N'] },
      { q: 'A 50 g bullet leaves a 4 kg gun at 400 m/s. Find the recoil speed.', steps: ['Total momentum before = 0', '0.05 × 400 = 4 × v → v = 5 m/s (backwards)'] },
    ],
  },
  {
    id: 'gravitation', subject: 'Physics', topic: 'Gravitation', title: 'Gravitation',
    intro: 'Every mass attracts every other mass. The same force that makes an apple fall keeps the Moon in orbit.',
    principle: 'F = Gm₁m₂/r²: the force is proportional to the product of the masses and inversely proportional to the square of the distance between their centres. Near a planet, g = GM/R². Mass is fixed; weight (mg) depends on where you are.',
    definitions: [['G', 'Universal gravitational constant, 6.67 × 10⁻¹¹ N m² kg⁻².'], ['g', 'Acceleration due to gravity, ≈ 9.8 m/s² at Earth’s surface.'], ['Weight', 'Gravitational force on a body, W = mg (newtons).'], ['Free fall', 'Motion under gravity alone.']],
    formulas: [['F = Gm₁m₂ / r²', 'law of gravitation'], ['g = GM / R²', 'surface gravity of a planet'], ['g ∝ ρR', 'for planets of density ρ (since M = ⁴⁄₃πR³ρ)']],
    examples: ['Your weight on the Moon is about one-sixth of that on Earth; your mass is unchanged.', 'Astronauts in orbit feel weightless because they and their spacecraft fall together, not because gravity is absent.'],
    misconceptions: ['“Heavier objects fall faster.” Without air resistance, all objects fall with the same acceleration g.', '“There is no gravity in space.” At the ISS altitude (≈ 400 km), g is still about 90% of its surface value.'],
    worked: [
      { q: 'If the distance between two bodies is tripled, what happens to the force?', steps: ['F ∝ 1/r²', '(1/3)² = 1/9 → the force becomes one-ninth.'] },
      { q: 'A planet has twice Earth’s mass and twice its radius. Find g there.', steps: ['g = GM/R² → g′ = G(2M)/(2R)² = (2/4) g', 'g′ = g/2 ≈ 4.9 m/s²'] },
    ],
  },
  {
    id: 'work-energy', subject: 'Physics', topic: 'Work, Energy & Power', title: 'Work, Energy and Power',
    intro: 'Energy is the capacity to do work. It is never created or destroyed — only transformed.',
    principle: 'Work = force × displacement in the direction of the force (W = Fs cos θ). KE = ½mv², PE = mgh. In the absence of friction, mechanical energy is conserved. Power is the rate of doing work.',
    definitions: [['Joule', '1 J = 1 N × 1 m.'], ['Watt', '1 W = 1 J/s.'], ['Efficiency', 'useful output energy ÷ input energy.']],
    formulas: [['W = F s cos θ', 'work'], ['KE = ½ m v²', 'kinetic energy'], ['PE = m g h', 'gravitational potential energy near Earth'], ['P = W / t = F v', 'power']],
    examples: ['Carrying a bag horizontally at constant speed: the lifting force is vertical, displacement horizontal, so (ideally) no work is done on the bag.', 'A hydroelectric dam converts the PE of stored water into KE and then electrical energy.'],
    misconceptions: ['“Doubling speed doubles kinetic energy.” KE ∝ v², so it quadruples.', '“Feeling tired means work was done.” Holding a heavy box still does no mechanical work on the box (s = 0).'],
    worked: [
      { q: 'A 2 kg ball is dropped from 20 m. Find its speed just before landing (g = 10 m/s²).', steps: ['PE lost = mgh = 2 × 10 × 20 = 400 J', '½ × 2 × v² = 400 → v = 20 m/s'] },
      { q: 'A 60 kg student climbs 4 m of stairs in 8 s. Find the power.', steps: ['W = mgh = 60 × 10 × 4 = 2400 J', 'P = 2400 / 8 = 300 W'] },
    ],
  },
  {
    id: 'sound', subject: 'Physics', topic: 'Sound', title: 'Sound and Waves',
    intro: 'Sound is a mechanical wave: a travelling pattern of compressions and rarefactions in a medium.',
    principle: 'Sound needs a medium and travels as a longitudinal wave. Its speed depends on the medium (fastest in solids, slowest in gases), not on frequency. v = fλ links speed, frequency and wavelength. Echoes are reflected sound.',
    definitions: [['Frequency', 'Oscillations per second (Hz); decides pitch.'], ['Amplitude', 'Maximum disturbance; decides loudness.'], ['Ultrasound', 'Frequency above 20 kHz.'], ['Infrasound', 'Frequency below 20 Hz.']],
    formulas: [['v = f λ', 'wave equation'], ['d = v t / 2', 'distance to a reflector from echo time t']],
    examples: ['Bats and SONAR use ultrasound echoes to locate objects.', 'You see lightning before you hear thunder because light is about a million times faster than sound.'],
    misconceptions: ['“Higher-pitched sound travels faster.” In a given medium all frequencies travel at the same speed; λ adjusts.', '“Sound travels faster in air on a still day than in water.” Sound is about 4 times faster in water (~1500 m/s) than in air (~340 m/s).'],
    worked: [
      { q: 'An echo from a cliff returns after 3 s. Speed of sound 340 m/s. How far is the cliff?', steps: ['Sound travels to the cliff and back: total path = 340 × 3 = 1020 m', 'Distance = 1020 / 2 = 510 m'] },
      { q: 'A 680 Hz note in air (340 m/s): find λ.', steps: ['λ = v/f = 340/680 = 0.5 m'] },
    ],
  },
  {
    id: 'pressure', subject: 'Physics', topic: 'Pressure & Buoyancy', title: 'Pressure, Buoyancy and Floating',
    intro: 'Pressure explains why knives cut, why dams are thicker at the bottom and why ships float.',
    principle: 'Pressure = force ÷ area. In a liquid, pressure increases with depth: P = hρg. A body in a fluid feels an upward buoyant force equal to the weight of fluid it displaces (Archimedes). It floats if its average density is less than the fluid’s.',
    definitions: [['Thrust', 'Force acting perpendicular to a surface.'], ['Pascal', '1 Pa = 1 N/m².'], ['Relative density', 'Density of a substance ÷ density of water (no unit).']],
    formulas: [['P = F / A', 'pressure'], ['P = h ρ g', 'liquid pressure at depth h'], ['F_b = V ρ_fluid g', 'buoyant force'], ['Fraction submerged = ρ_body / ρ_fluid', 'for a floating body']],
    examples: ['Camels’ broad feet spread their weight and stop them sinking into sand.', 'A ship floats higher in sea water than in river water because sea water is denser.'],
    misconceptions: ['“Heavy things sink.” A steel ship floats because its hollow shape gives it a low average density.', '“Buoyant force depends on the depth.” For a fully submerged incompressible body, it depends only on the displaced volume and the fluid density.'],
    worked: [
      { q: 'A wooden block of density 600 kg/m³ floats in water. What fraction is submerged?', steps: ['Fraction = 600 / 1000 = 0.6', '60% below the surface, 40% above.'] },
      { q: 'Find the water pressure (excluding atmosphere) 5 m below the surface (g = 10).', steps: ['P = hρg = 5 × 1000 × 10 = 5 × 10⁴ Pa'] },
    ],
  },
  {
    id: 'light', subject: 'Physics', topic: 'Light', title: 'Light: Reflection and Refraction',
    intro: 'Light travels in straight lines, bounces off surfaces and bends when it changes medium.',
    principle: 'Reflection: angle of incidence = angle of reflection. Refraction: light slows in denser media and bends towards the normal; refractive index n = c/v. Mirrors and lenses follow 1/f = 1/v ± 1/u with a sign convention.',
    definitions: [['Refractive index', 'n = speed of light in vacuum ÷ speed in the medium.'], ['Focal length', 'Distance from the pole/optical centre to the principal focus.'], ['Power of a lens', 'P = 1/f (f in metres), unit dioptre (D).']],
    formulas: [['n = c / v', 'refractive index'], ['1/v − 1/u = 1/f', 'lens formula (Cartesian signs)'], ['m = v / u', 'magnification for a lens'], ['P = 1 / f', 'lens power']],
    examples: ['A pencil in water looks bent because light from it refracts at the surface.', 'Rainbows form by dispersion: different colours refract by different amounts in raindrops.'],
    misconceptions: ['“A plane mirror image is formed on the mirror surface.” It is as far behind the mirror as the object is in front.', '“Light bends because it hits the surface.” It bends because its speed changes at the boundary.'],
    worked: [
      { q: 'Light travels at 2 × 10⁸ m/s in glass. Find n.', steps: ['n = 3 × 10⁸ / 2 × 10⁸ = 1.5'] },
      { q: 'Power of a convex lens of focal length 25 cm?', steps: ['f = 0.25 m', 'P = 1/0.25 = +4 D'] },
    ],
  },
  {
    id: 'electricity', subject: 'Physics', topic: 'Electricity', title: 'Electric Current and Circuits',
    intro: 'Electric current is the flow of charge. Resistance controls how much current flows for a given voltage.',
    principle: 'Ohm’s law: V = IR (at constant temperature). R = ρL/A: resistance rises with length and falls with cross-sectional area. Series resistors add; in parallel, reciprocals add. Power P = VI = I²R = V²/R.',
    definitions: [['Current', 'I = Q/t, in amperes.'], ['Potential difference', 'Work done per unit charge, in volts.'], ['Resistivity ρ', 'Property of the material (Ω m), independent of shape.']],
    formulas: [['V = I R', "Ohm's law"], ['R = ρ L / A', 'resistance of a wire'], ['R_s = R₁ + R₂', 'series'], ['1/R_p = 1/R₁ + 1/R₂', 'parallel'], ['P = V I = I² R = V² / R', 'electrical power']],
    examples: ['Household appliances are wired in parallel so each gets the full mains voltage and can be switched separately.', 'A fuse wire melts when the current exceeds its rating, protecting the circuit.'],
    misconceptions: ['“Current is used up by a bulb.” Current is the same everywhere in a series loop; energy is transferred, charge is not consumed.', '“Adding more resistors always increases total resistance.” Adding a resistor in parallel decreases it.'],
    worked: [
      { q: 'A wire of resistance 4 Ω is stretched to twice its length (volume unchanged). New resistance?', steps: ['Length ×2, so area ×½ (volume constant)', 'R = ρL/A → ×2 × 2 = ×4', 'New R = 16 Ω'] },
      { q: 'Two 6 Ω resistors in parallel across 12 V: total current?', steps: ['R_p = 3 Ω', 'I = 12/3 = 4 A'] },
    ],
  },
  // ------------------------------------------------------------------ CHEMISTRY
  {
    id: 'matter', subject: 'Chemistry', topic: 'Matter', title: 'Matter and Its States',
    intro: 'Everything with mass and volume is matter, made of particles that are constantly moving and attracting each other.',
    principle: 'The state of matter depends on the balance between particle kinetic energy (temperature) and inter-particle attraction (pressure helps by pushing particles together). During a change of state, temperature stays constant because the heat supplied (latent heat) breaks attractions instead of raising kinetic energy.',
    definitions: [['Latent heat', 'Heat absorbed or released during a change of state at constant temperature.'], ['Evaporation', 'Escape of surface particles below the boiling point.'], ['Sublimation', 'Solid → gas without becoming liquid (e.g. camphor, dry ice).'], ['Diffusion', 'Spontaneous mixing of particles due to their motion.']],
    formulas: [['K = °C + 273', 'Kelvin conversion'], ['Q = m L', 'heat for a change of state']],
    examples: ['Sweating cools you because evaporation takes latent heat from your skin.', 'Pressure cookers cook faster: higher pressure raises the boiling point of water above 100 °C.'],
    misconceptions: ['“Boiling water keeps getting hotter while it boils.” At constant pressure, temperature stays at the boiling point until all water has boiled.', '“Evaporation needs boiling temperature.” It happens at all temperatures from the surface.'],
    worked: [
      { q: 'Convert 300 K to Celsius.', steps: ['°C = K − 273 = 27 °C'] },
      { q: 'Why does steam at 100 °C burn more than water at 100 °C?', steps: ['Steam carries the extra latent heat of vaporisation (≈ 2.26 × 10⁶ J/kg).', 'It releases this on condensing on the skin, in addition to cooling.'] },
    ],
  },
  {
    id: 'atoms-molecules', subject: 'Chemistry', topic: 'Atoms & Molecules', title: 'Atoms, Molecules and the Mole',
    intro: 'Chemists count particles in moles so that they can weigh out the right number of atoms on a balance.',
    principle: 'Matter combines in fixed mass ratios (law of constant proportions) and mass is conserved in reactions. One mole contains 6.022 × 10²³ particles and has a mass in grams equal to the atomic/molecular mass.',
    definitions: [['Mole', 'Amount containing 6.022 × 10²³ particles (Avogadro constant).'], ['Molar mass', 'Mass of one mole, g/mol.'], ['Valency', 'Combining capacity of an atom.']],
    formulas: [['n = m / M', 'moles from mass'], ['N = n × Nₐ', 'number of particles'], ['% element = (mass of element in formula / molar mass) × 100', 'percentage composition']],
    examples: ['18 g of water (1 mol) contains 6.022 × 10²³ molecules.', 'Water always contains hydrogen and oxygen in the mass ratio 1 : 8.'],
    misconceptions: ['“One mole of every substance has the same mass.” It has the same NUMBER of particles; mass depends on molar mass.', '“A molecule and a mole are the same.” A mole is 6.022 × 10²³ molecules.'],
    worked: [
      { q: 'How many moles are in 44 g of CO₂?', steps: ['M(CO₂) = 12 + 2 × 16 = 44 g/mol', 'n = 44/44 = 1 mol'] },
      { q: 'How many atoms are in 0.5 mol of O₂?', steps: ['Molecules = 0.5 × 6.022 × 10²³ = 3.011 × 10²³', 'Each has 2 atoms → 6.022 × 10²³ atoms'] },
    ],
  },
  {
    id: 'atomic-structure', subject: 'Chemistry', topic: 'Atomic Structure', title: 'Inside the Atom',
    intro: 'An atom is a tiny, dense, positive nucleus surrounded by electrons in shells.',
    principle: 'Rutherford’s gold-foil experiment showed that most of the atom is empty space with a small, dense nucleus. Bohr placed electrons in fixed shells (K, L, M…) holding at most 2n² electrons; the outermost shell (max 8) decides valency and chemistry.',
    definitions: [['Atomic number Z', 'Number of protons.'], ['Mass number A', 'Protons + neutrons.'], ['Isotopes', 'Same Z, different A (e.g. ¹²C, ¹⁴C).'], ['Isobars', 'Same A, different Z (e.g. ⁴⁰Ar, ⁴⁰Ca).']],
    formulas: [['Neutrons = A − Z', ''], ['Max electrons in shell n = 2n²', ''], ['Average atomic mass = Σ (fraction × isotope mass)', '']],
    examples: ['Chlorine’s atomic mass is 35.5 because it is about 75% ³⁵Cl and 25% ³⁷Cl.', 'Carbon-14 dating uses a radioactive isotope of carbon.'],
    misconceptions: ['“Isotopes have different chemical properties.” They have the same electron arrangement, so essentially the same chemistry.', '“Electrons orbit like planets in any orbit.” In Bohr’s model only certain energy levels are allowed.'],
    worked: [
      { q: 'Electronic configuration and valency of sulphur (Z = 16)?', steps: ['2, 8, 6', '6 valence electrons → needs 2 more → valency 2'] },
      { q: 'An element has isotopes of mass 10 (20%) and 11 (80%). Average atomic mass?', steps: ['0.2 × 10 + 0.8 × 11 = 2 + 8.8 = 10.8 u'] },
    ],
  },
  {
    id: 'reactions', subject: 'Chemistry', topic: 'Chemical Reactions', title: 'Chemical Reactions and Equations',
    intro: 'In a chemical reaction atoms rearrange to form new substances; no atom is created or destroyed.',
    principle: 'Balanced equations conserve atoms of every element. Main types: combination, decomposition, displacement, double displacement, and redox (oxidation = gain of oxygen / loss of electrons; reduction = the reverse). A more reactive metal displaces a less reactive one from its salt solution.',
    definitions: [['Oxidation', 'Gain of oxygen, loss of hydrogen, or loss of electrons.'], ['Reduction', 'Loss of oxygen, gain of hydrogen, or gain of electrons.'], ['Precipitate', 'Insoluble solid formed in a solution reaction.']],
    formulas: [['Zn + CuSO₄ → ZnSO₄ + Cu', 'displacement'], ['CaCO₃ → CaO + CO₂', 'thermal decomposition'], ['AgNO₃ + NaCl → AgCl↓ + NaNO₃', 'double displacement (precipitation)']],
    examples: ['Rusting of iron is slow oxidation.', 'Respiration is a combustion-like redox reaction that releases energy from glucose.'],
    misconceptions: ['“Balancing means changing subscripts.” Only coefficients change; changing subscripts changes the substance.', '“Oxidation always involves oxygen.” Loss of electrons counts, even with no oxygen present.'],
    worked: [
      { q: 'Balance: Fe + O₂ → Fe₂O₃', steps: ['Need even O: 2 Fe₂O₃ → 6 O → 3 O₂', 'Fe: 4 Fe', '4Fe + 3O₂ → 2Fe₂O₃'] },
      { q: 'In CuO + H₂ → Cu + H₂O, what is oxidised?', steps: ['H₂ gains oxygen → oxidised', 'CuO loses oxygen → reduced'] },
    ],
  },
  {
    id: 'acids', subject: 'Chemistry', topic: 'Acids, Bases & Salts', title: 'Acids, Bases and Salts',
    intro: 'Acids and bases are everywhere — in lemons, soaps, stomachs and soil.',
    principle: 'Acids release H⁺ (H₃O⁺) ions in water; bases release OH⁻. Neutralisation forms salt and water. pH measures H⁺ concentration on a logarithmic scale: each unit is a factor of 10.',
    definitions: [['pH', '7 neutral, < 7 acidic, > 7 basic (at 25 °C).'], ['Indicator', 'Substance that changes colour with pH (litmus, phenolphthalein).'], ['Alkali', 'A base that dissolves in water.']],
    formulas: [['Acid + Base → Salt + Water', 'neutralisation'], ['Metal carbonate + Acid → Salt + H₂O + CO₂', ''], ['pH 3 has 10× the [H⁺] of pH 4', 'log scale']],
    examples: ['Antacids (e.g. milk of magnesia) neutralise excess stomach acid.', 'Baking soda (NaHCO₃) releases CO₂ that makes cakes rise.'],
    misconceptions: ['“A strong acid is the same as a concentrated acid.” Strength = degree of ionisation; concentration = amount per volume.', '“pH 4 is twice as acidic as pH 2.” pH 2 has 100 times the H⁺ concentration of pH 4.'],
    worked: [
      { q: 'Solution A has pH 2 and B has pH 5. Compare [H⁺].', steps: ['Difference 3 units → 10³', 'A has 1000 times the H⁺ concentration of B.'] },
      { q: 'Name the salt from HCl + NaOH.', steps: ['HCl + NaOH → NaCl + H₂O', 'Sodium chloride (neutral, pH 7)'] },
    ],
  },
  // ------------------------------------------------------------------ BIOLOGY
  {
    id: 'cell', subject: 'Biology', topic: 'Cell Biology', title: 'The Cell',
    intro: 'The cell is the basic structural and functional unit of life. Each organelle does a specific job.',
    principle: 'The plasma membrane is selectively permeable; water moves by osmosis from dilute to concentrated solution. Mitochondria release energy (ATP) by respiration, chloroplasts capture light, ribosomes make proteins, the nucleus holds DNA. Mitosis makes identical cells for growth; meiosis halves the chromosome number for gametes.',
    definitions: [['Osmosis', 'Movement of water through a selectively permeable membrane from higher to lower water concentration.'], ['Prokaryote', 'Cell without a membrane-bound nucleus (bacteria).'], ['Plasmolysis', 'Shrinking of cytoplasm away from the cell wall in a hypertonic solution.']],
    formulas: [['Mitosis: 2n → 2n + 2n', 'identical daughter cells'], ['Meiosis: 2n → four n cells', 'gametes']],
    examples: ['Raisins swell in water — osmosis.', 'Salting pickles kills microbes by drawing water out of their cells.'],
    misconceptions: ['“Plant cells don’t have mitochondria because they have chloroplasts.” Plant cells have both.', '“Cell walls are selectively permeable.” The cell wall is freely permeable; the membrane is selective.'],
    worked: [
      { q: 'A human cell has 46 chromosomes. How many in each cell after mitosis, and in a sperm?', steps: ['Mitosis keeps the number: 46', 'Meiosis halves it: 23 in a sperm'] },
      { q: 'A plant cell is placed in concentrated salt solution. Predict and explain.', steps: ['Outside has lower water concentration', 'Water leaves by osmosis → vacuole shrinks → plasmolysis'] },
    ],
  },
  {
    id: 'tissues', subject: 'Biology', topic: 'Tissues', title: 'Plant and Animal Tissues',
    intro: 'Cells with similar structure work together as tissues to perform specific functions.',
    principle: 'Plants: meristematic tissue divides (tips, cambium); permanent tissues (parenchyma, collenchyma, sclerenchyma, xylem, phloem) are specialised. Animals: epithelial (covering), connective (blood, bone, cartilage, tendons, ligaments), muscular (striated, smooth, cardiac) and nervous tissue.',
    definitions: [['Xylem', 'Conducts water and minerals upward; dead vessels and tracheids.'], ['Phloem', 'Conducts food; living sieve tubes and companion cells.'], ['Tendon vs ligament', 'Tendon joins muscle to bone; ligament joins bone to bone.']],
    formulas: [],
    examples: ['Coconut husk fibres are sclerenchyma.', 'The heart never tires because cardiac muscle is specialised for rhythmic, involuntary contraction.'],
    misconceptions: ['“Blood is not a tissue.” Blood is a fluid connective tissue.', '“Xylem carries food.” Phloem carries food; xylem carries water.'],
    worked: [
      { q: 'A plant stem keeps growing in girth for years. Which tissue is responsible?', steps: ['Growth in girth = lateral meristem (cambium).'] },
      { q: 'Which muscle is striated AND involuntary?', steps: ['Skeletal: striated, voluntary', 'Smooth: unstriated, involuntary', 'Cardiac: striated, involuntary ✓'] },
    ],
  },
  {
    id: 'genetics', subject: 'Biology', topic: 'Genetics', title: 'Heredity and Genetics',
    intro: 'Traits pass from parents to offspring through genes — segments of DNA on chromosomes.',
    principle: 'Each individual carries two alleles of each gene, one from each parent. A dominant allele shows its effect even in a single copy. A monohybrid cross of two heterozygotes (Tt × Tt) gives a 3 : 1 phenotype ratio and a 1 : 2 : 1 genotype ratio.',
    definitions: [['Allele', 'Alternative form of a gene.'], ['Genotype', 'Allele combination (e.g. Tt).'], ['Phenotype', 'Observable trait (e.g. tall).'], ['Homozygous', 'Two identical alleles.']],
    formulas: [['Tt × Tt → 1 TT : 2 Tt : 1 tt', '3 : 1 phenotype'], ['Tt × tt → 1 Tt : 1 tt', 'test cross']],
    examples: ['Human sex is decided by the father’s sperm carrying X or Y.', 'Pea plant height, seed shape and flower colour were Mendel’s classic traits.'],
    misconceptions: ['“Dominant traits are the most common.” Dominance is about expression, not frequency.', '“Acquired characteristics are inherited.” A bodybuilder’s muscles are not passed on through genes.'],
    worked: [
      { q: 'Two heterozygous tall plants are crossed; 400 offspring. How many are dwarf?', steps: ['Tt × Tt → ¼ tt', '400 × ¼ = 100 dwarf'] },
      { q: 'What is the chance a couple’s child is a boy?', steps: ['Mother gives X; father gives X or Y with equal chance', 'P(boy) = ½'] },
    ],
  },
  {
    id: 'ecology', subject: 'Biology', topic: 'Ecology', title: 'Ecosystems and Energy Flow',
    intro: 'An ecosystem is living organisms interacting with each other and their physical environment.',
    principle: 'Energy flows one way: sun → producers → consumers, and only about 10% passes to each next trophic level (the rest is used or lost as heat). Nutrients (carbon, nitrogen, water) cycle. Harmful non-degradable chemicals concentrate up food chains (biomagnification).',
    definitions: [['Trophic level', 'Feeding position in a food chain.'], ['Decomposer', 'Breaks down dead matter, returning nutrients.'], ['Biomagnification', 'Increase of a persistent chemical’s concentration at higher trophic levels.']],
    formulas: [['Energy at next level ≈ 10% of previous', '10% law (Lindeman)']],
    examples: ['DDT accumulated in birds of prey and thinned their egg shells.', 'Nitrogen-fixing bacteria in legume root nodules enrich soil.'],
    misconceptions: ['“Energy is recycled in ecosystems.” Nutrients recycle; energy flows through and is lost as heat.', '“Top predators have the most energy.” They receive the least.'],
    worked: [
      { q: 'Producers capture 10,000 J. How much reaches the tertiary consumer?', steps: ['Primary: 1000 J, secondary: 100 J, tertiary: 10 J'] },
      { q: 'Why are food chains rarely longer than 4–5 links?', steps: ['Each step loses ≈ 90% of the energy', 'Too little energy remains to support another level'] },
    ],
  },
  // ------------------------------------------------------------------ SPACE
  {
    id: 'gravity-space', subject: 'Space Science', topic: 'Gravity in Space', title: 'Orbits and Gravity in Space',
    intro: 'Satellites do not escape gravity — gravity is exactly what keeps them in orbit.',
    principle: 'An orbiting object is in continuous free fall: it moves sideways so fast that the ground curves away beneath it as it falls. Gravity supplies the centripetal force. Lower orbits are faster; geostationary satellites orbit once per day above the equator (≈ 35,800 km altitude).',
    definitions: [['Orbital period', 'Time for one complete orbit.'], ['Geostationary orbit', 'Equatorial orbit with a 24 h period, appearing fixed over one place.'], ['Escape velocity', 'Minimum launch speed to escape a body’s gravity (Earth ≈ 11.2 km/s).']],
    formulas: [['v = √(GM / r)', 'orbital speed'], ['T² ∝ r³', "Kepler's third law"]],
    examples: ['The ISS orbits Earth about every 90 minutes.', 'Communication and weather satellites (e.g. INSAT series) use geostationary orbits.'],
    misconceptions: ['“Astronauts float because there is no gravity.” They are in free fall along with the station.', '“Bigger satellites need faster orbits.” Orbital speed does not depend on the satellite’s mass.'],
    worked: [
      { q: 'Planet B orbits at 4 times the distance of planet A. Compare periods.', steps: ['T² ∝ r³ → T ∝ r^1.5', '4^1.5 = 8 → B takes 8 times as long'] },
    ],
  },
  // ------------------------------------------------------------------ ENVIRONMENT
  {
    id: 'climate', subject: 'Environment & Technology', topic: 'Climate Science', title: 'The Greenhouse Effect and Climate',
    intro: 'Earth’s climate depends on the balance between energy arriving from the Sun and energy radiated back to space.',
    principle: 'Sunlight (mostly visible) passes through the atmosphere and warms the surface. The warm surface emits infrared, which greenhouse gases (CO₂, CH₄, H₂O, N₂O) absorb and re-emit, keeping Earth about 33 °C warmer than it would otherwise be. Adding these gases enhances the effect and causes global warming.',
    definitions: [['Greenhouse gas', 'Gas that absorbs infrared radiation.'], ['Albedo', 'Fraction of incoming sunlight reflected.'], ['Ozone layer', 'Stratospheric O₃ that absorbs UV — a different issue from global warming.']],
    formulas: [],
    examples: ['Melting Arctic sea ice lowers albedo, so more sunlight is absorbed — a positive feedback.', 'Methane traps far more heat per molecule than CO₂ over decades, though there is much less of it.'],
    misconceptions: ['“The ozone hole causes global warming.” They are largely separate problems: ozone loss lets in more UV; warming comes from extra greenhouse gases.', '“The greenhouse effect is entirely bad.” Without it, Earth’s average temperature would be about −18 °C.'],
    worked: [{ q: 'Why does a city with dark roads and roofs get hotter than surrounding fields?', steps: ['Dark surfaces have low albedo → absorb more sunlight', 'Less vegetation → less cooling by evaporation (transpiration)', 'Result: urban heat island'] }],
  },
  // ------------------------------------------------------------------ REASONING
  {
    id: 'experiments', subject: 'Scientific Reasoning', topic: 'Experimental Design', title: 'Designing a Fair Experiment',
    intro: 'A good experiment changes one thing, measures one thing and keeps everything else the same.',
    principle: 'The independent variable is what you change; the dependent variable is what you measure; controlled variables are kept constant so that any effect can be attributed to the independent variable. A control group shows what happens without the treatment. Repeats reduce random error.',
    definitions: [['Hypothesis', 'A testable prediction with a reason.'], ['Control', 'Set-up identical except for the variable being tested.'], ['Random vs systematic error', 'Random errors scatter readings; systematic errors shift all readings the same way.']],
    formulas: [],
    examples: ['Testing whether light affects plant growth: same species, soil, water and pot size; only light changes.', 'Double-blind drug trials stop expectations biasing results.'],
    misconceptions: ['“One result proves a hypothesis.” Results must be repeatable; evidence can support but not prove.', '“Correlation means causation.” Ice-cream sales and drownings both rise in summer because of heat, not each other.'],
    worked: [{ q: 'A student tests if sugar speeds yeast growth but uses warm water for the sugar flask and cold for the other. What is wrong?', steps: ['Two variables changed: sugar and temperature', 'Any difference cannot be assigned to sugar alone', 'Fix: same temperature in both flasks'] }],
  },
];
