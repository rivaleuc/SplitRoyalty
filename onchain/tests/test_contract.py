import json


def _prompt(gl_mod, ret):
    gl_mod.nondet.exec_prompt = lambda *a, **k: ret


def _contribs():
    return json.dumps([
        {"name": "Alice", "role": "lead engineer"},
        {"name": "Bob", "role": "designer"},
        {"name": "Carol", "role": "writer"},
    ])


def _judged(contract, gl_mod, ret):
    _prompt(gl_mod, ret)
    k = contract.create_project("Album", _contribs(), "a collaborative album")
    contract.judge_splits(k)
    return contract.get_project(k)


def test_anchor_sum_100_and_at_least_two(contract, gl_mod):
    p = _judged(contract, gl_mod, {
        "splits": [
            {"name": "Alice", "percentage": 50},
            {"name": "Bob", "percentage": 30},
            {"name": "Carol", "percentage": 20},
        ],
        "reasoning": "weighted by effort",
    })
    splits = p["splits"]
    assert len(splits) >= 2
    assert sum(s["percentage"] for s in splits) == 100
    assert all(isinstance(s["percentage"], int) and not isinstance(s["percentage"], bool) for s in splits)


def test_validator_rejects_bad_inputs(contract, gl_mod):
    _judged(contract, gl_mod, {
        "splits": [{"name": "Alice", "percentage": 60}, {"name": "Bob", "percentage": 40}],
        "reasoning": "ok",
    })
    v = gl_mod.vm._last_validator
    R = gl_mod.vm.Return
    assert v(object()) is False
    assert v(R("not json")) is False
    # fewer than 2 splits
    assert v(R(json.dumps({"splits": [{"name": "A", "percentage": 100}]}))) is False
    # empty name
    assert v(R(json.dumps({"splits": [{"name": "", "percentage": 50}, {"name": "B", "percentage": 50}]}))) is False
    # percentage is a bool (bool guard)
    assert v(R(json.dumps({"splits": [{"name": "A", "percentage": True}, {"name": "B", "percentage": 100}]}))) is False
    # percentage out of range
    assert v(R(json.dumps({"splits": [{"name": "A", "percentage": -1}, {"name": "B", "percentage": 101}]}))) is False
    # sum != 100
    assert v(R(json.dumps({"splits": [{"name": "A", "percentage": 50}, {"name": "B", "percentage": 40}]}))) is False
    # fully valid
    assert v(R(json.dumps({"splits": [{"name": "A", "percentage": 50}, {"name": "B", "percentage": 50}]}))) is True


def test_normalized_output_always_validates(contract, gl_mod):
    # Model percentages don't sum to 100 and include a bool; leader normalizes.
    _prompt(gl_mod, {
        "splits": [
            {"name": "Alice", "percentage": 40},
            {"name": "Bob", "percentage": 20},
            {"name": "Carol", "percentage": True},
        ],
        "reasoning": "rough estimate",
    })
    k = contract.create_project("Album", _contribs(), "desc")
    contract.judge_splits(k)  # raises if normalized output failed validation
    out = gl_mod.vm._last_leader()
    assert gl_mod.vm._last_validator(gl_mod.vm.Return(out)) is True
    splits = json.loads(out)["splits"]
    assert sum(s["percentage"] for s in splits) == 100
    assert len(splits) >= 2


def test_normalized_even_split_when_model_empty(contract, gl_mod):
    # Model returns no usable splits; leader falls back to an even, valid split.
    _prompt(gl_mod, {"splits": [], "reasoning": "n/a"})
    k = contract.create_project("Album", _contribs(), "desc")
    contract.judge_splits(k)
    out = gl_mod.vm._last_leader()
    assert gl_mod.vm._last_validator(gl_mod.vm.Return(out)) is True
    splits = json.loads(out)["splits"]
    assert sum(s["percentage"] for s in splits) == 100
    assert len(splits) == 3
