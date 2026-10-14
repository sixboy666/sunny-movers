// orders.js — six routes, escalating loads
export const ORDERS = [
  {
    id: 1, name: 'Seaside Starter', customer: 'Mrs. Codex', place: 'SUNSHELL BAY',
    blurb: 'Four treasured things. One new seaside home.',
    thanks: 'Mrs. Codex waves from the porch. Tea anytime!',
    items: [ ['sofa', 1], ['box', 1], ['plant', 1], ['chair', 1] ],
  },
  {
    id: 2, name: 'Palm Street', customer: 'Mr. Pico', place: 'PALM STREET',
    blurb: 'A reading corner, right under the palms.',
    thanks: 'Mr. Pico is already halfway through chapter one.',
    items: [ ['lamp', 1], ['table', 1], ['chair', 1], ['box', 1] ],
  },
  {
    id: 3, name: 'Driftwood Lane', customer: 'The Ferns', place: 'DRIFTWOOD LANE',
    blurb: 'Cold lemonade, warm cat, happy ferns.',
    thanks: 'The cat claimed the carrier before the sofa. Typical.',
    items: [ ['fridge', 1], ['sofa', 1], ['plant', 1], ['carrier', 1], ['box', 1] ],
  },
  {
    id: 4, name: 'Coral Court', customer: 'Captain Mira', place: 'CORAL COURT',
    blurb: 'Boards waxed, tide high, naps scheduled.',
    thanks: 'Captain Mira salutes from the dunes. Surf’s up!',
    items: [ ['surf', 2], ['mattress', 1], ['box', 1], ['lamp', 1] ],
  },
  {
    id: 5, name: 'Turtle Terrace', customer: 'The Bots', place: 'TURTLE TERRACE',
    blurb: 'Six little comforts for a very tidy family.',
    thanks: 'The Bots labeled every box twice. Impressive.',
    items: [ ['fridge', 1], ['chair', 2], ['table', 1], ['music', 1], ['plant', 1] ],
  },
  {
    id: 6, name: 'Lighthouse Point', customer: 'Old Sam', place: 'LIGHTHOUSE POINT',
    blurb: 'One last hill before the lighthouse light.',
    thanks: 'Old Sam plays a sea shanty just for you.',
    items: [ ['keyboard', 1], ['mattress', 1], ['gnome', 2], ['carrier', 1], ['box', 1] ],
  },
];
