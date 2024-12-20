class Super3 {
  static propOneHop = 'abc';
  static propThreeHops = 'abc';
}

class Super2 extends Super3 {
  static oneHop() {
  }

  static twoHops() {
  }
}

class Super extends Super2 {
  static propOneHop = 'abc';
  static oneHop() {
  }
}

class Foo extends Super {
  static baz() {
    Super.oneHop();
    Super2.twoHops();
    return Super.propOneHop + Super3.propThreeHops;
  }
}