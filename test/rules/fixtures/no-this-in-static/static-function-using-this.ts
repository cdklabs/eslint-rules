class Foo {
  static prop = 'abc';

  static bar() {
  }

  static baz() {
    this.bar();
    return this.prop;
  }
}