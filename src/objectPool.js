export class ObjectPool {
  constructor(factory, size) {
    this.factory = factory;
    this.pool = [];
    for (let i = 0; i < size; i++) {
      this.pool.push(factory());
    }
  }

  acquire() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    return this.factory();
  }

  release(obj) {
    if (obj.reset) {
      obj.reset();
    }
    this.pool.push(obj);
  }
}

