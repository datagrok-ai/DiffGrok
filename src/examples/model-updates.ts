/* eslint-disable max-len */
/** This example shows how to apply pipelines and models with updates.
    This approach can be used for in-webworkers analysis of models.

    Here, we consider gluconic acid (GA) production by Aspergillus niger modeling.
*/

import * as DGL from '../../index';

/** 1. Model specification: the M|M|2|2 model  */
const model = `#name: GA-production
#tags: model
#description: Gluconic acid (GA) production by Aspergillus niger modeling
#equations:
  dX/dt = rX
  dS/dt = -gamma * rX - lambda * X
  dO/dt = Kla * (Cod - O) - delta * rX - phi * X
  dP/dt = alpha * rX + beta * X

#expressions:
  mu = muM * S / (Ks + S) * O / (Ko + O)
  rX = mu * X

#argument: t, 1-st stage
  _t0 = 0 {units: h; caption: initial; category: Misc} [Start of the process]
  _t1 = 60 {units: h; caption: 1-st stage; category: Durations; min: 20; max: 80} [Duration of the 1-st stage]
  step = 0.1 {units: h; caption: step; category: Misc; min: 0.01; max: 1} [Time step of simulation]

#update: 2-nd stage
  duration = overall - _t1
  S += 70

#inits:  
  X = 5 {units: kg/m³; caption: biomass; category: Initial concentrations; min: 1; max: 10} [Aspergillus niger biomass]
  S = 150 {units: kg/m³; caption: glucose; category: Initial concentrations; min: 50; max: 200} [Glucose]
  O = 7 {units: kg/m³; caption: oxygen; category: Initial concentrations; min: 1; max: 10} [Dissolved oxygen]
  P = 0 {units: kg/m³; caption: acid; category: Initial concentrations; min: 0; max: 0.1} [Gluconic acid]

#output:
  t {caption: time}
  X {caption: biomass}
  S {caption: glucose}
  O {caption: oxygen}
  P {caption: acid}

#parameters:
  overall = 100 {units: h; category: Durations; min: 100; max: 140} [Overall duration]
  muM = 0.668 {units: 1/h; category: Parameters} [Monod type model parameter]
  alpha = 2.92 {category: Parameters} [Monod type model parameter]
  beta = 0.131 {units: 1/h; category: Parameters} [Monod type model parameter]
  gamma = 2.12 {category: Parameters} [Monod type model parameter]
  lambda = 0.232 {units: 1/h; category: Parameters} [Monod type model parameter]
  delta = 0.278 {category: Parameters} [Monod type model parameter]
  phi = 4.87e-3 {units: 1/h; category: Parameters} [Monod type model parameter]
  Ks = 1.309e2 {units: g/L; category: Parameters} [Monod type model parameter]
  Ko = 3.63e-4 {units: g/L; category: Parameters} [Monod type model parameter]
  Kla = 1.7e-2 {units: 1/s; category: Parameters} [Volumetric mass transfer coefficient]
  Cod = 15 {units: kg/m³; category: Parameters} [Liquid phase dissolved oxygen saturation concentration]
  
#tolerance: 1e-9`;

/** 2. Generate IVP-objects: for the main thread & for computations in webworkers */
const ivp = DGL.getIVP(model);
const ivpWW = DGL.getIvp2WebWorker(ivp);

/** 3. Perform computations */
try {
  // 3.1) Extract names of outputs
  const outputNames = DGL.getOutputNames(ivp);
  const outSize = outputNames.length;

  // 3.2) Set model inputs
  const inputs = {
    _t0: 0,
    _t1: 60,
    _h: 1,
    X: 5,
    S: 150,
    O: 7,
    P: 0,
    overall: 100,
    muM: 0.668,
    alpha: 2.92,
    beta: 0.131,
    gamma: 2.12,
    lambda: 0.232,
    delta: 0.278,
    phi: 4.87e-3,
    Ks: 1.309e2,
    Ko: 3.63e-4,
    Kla: 1.7e-2,
    Cod: 15,
  };
  const inputVector = DGL.getInputVector(inputs, ivp);

  // 3.3) Create a pipeline
  const creator = DGL.getPipelineCreator(ivp);
  const pipeline = creator.getPipeline(inputVector);

  // 3.4) Apply pipeline to perform computations
  const solution = DGL.applyPipeline(pipeline, ivpWW, inputVector);

  // 3.5) Print results

  // 3.5.1) Table header
  let line = '     ';
  outputNames.forEach((name) => line += name + '         ');
  console.log(line);

  // 3.5.2) Table with solution
  const length = solution[0].length;
  for (let i = 0; i < length; ++i) {
    line = '';

    for (let j = 0; j < outSize; ++j)
      line += solution[j][i].toFixed(8) + '     ';

    console.log(line);
  }
} catch (err) {
  console.log('Simulation failed: ', err instanceof Error ? err.message : 'Unknown problem!');
}
