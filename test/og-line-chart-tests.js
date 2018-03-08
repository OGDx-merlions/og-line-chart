// This is the placeholder suite to place custom tests in
// Use testCase(options) for a more convenient setup of the test cases
suite('Custom Automation Tests for og-line-chart', () => {
  test('Check initial value of counter', done => {
    let counterEl = fixture('og-line-chart-fixture'),
        counterValueEl = Polymer.dom(counterEl.root).querySelector('span');
    debugger;
    assert.equal(counterValueEl.textContent, '0');
    done();
  });

  test('Clicking og-line-chart increments the counter', done => {
    let counterEl = fixture('og-line-chart-fixture'),
        counterValueEl = Polymer.dom(counterEl.root).querySelector('span');
    assert.equal(counterValueEl.textContent, '0');

    counterEl.click();
    flush(function(){
      assert.equal(counterValueEl.textContent, '1');
    });
    done();
  });
});
