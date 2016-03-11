var uuid = require('node-uuid')

import Backbeam from './'

class Job {

  constructor (backbeam, status, steps) {
    this.id = uuid.v4()
    this.backbeam = backbeam
    this.steps = steps
    this.name = status
    backbeam.emit('job:start', { id: this.id, name: status, steps: steps })
  }

  run (promise) {
    if (this.running) return promise
    this.running = true
    return promise
      .then(() => (
        this.backbeam.emit('job:succees', { id: this.id })
      ))
      .catch((e) => {
        this.emit('job:fail', { id: this.job, error: e })
        return Promise.reject(e)
      })
  }

  progress (log, steps = 0) {
    this.steps += steps
    this.backbeam.emit('job:progress', {
      id: this.id,
      log: log,
      steps: this.steps,
      name: this.name
    })
  }

}

Backbeam.prototype._job = function (status, steps, job) {
  if (job) {
    job.progress(status, steps)
    return job
  } else {
    return new Job(this, status, steps)
  }
}
