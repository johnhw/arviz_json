// uses jStat

function sym_dirichlet(alpha, n) {
    var gamma = jStat(0, 1, n, (_) => jStat.gamma.sample(alpha, 1))[0];
    var gamma_sum = jStat.sum(gamma);
    return jStat(gamma, x => x / gamma_sum)[0];
}