class Foo {
  static prop = 'abc';

  static bar() {
  }

  static baz() {
    Foo.bar();
    return Foo.prop;
  }
}