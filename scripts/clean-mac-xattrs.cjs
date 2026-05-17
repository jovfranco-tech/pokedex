const { execFileSync } = require('node:child_process')

module.exports = async function cleanMacExtendedAttributes(context) {
  if (context.electronPlatformName !== 'darwin') return

  try {
    console.log(`[desktop] Limpiando atributos extendidos en ${context.appOutDir}`)
    execFileSync('xattr', ['-cr', context.appOutDir], { stdio: 'ignore' })
    execFileSync('dot_clean', ['-m', context.appOutDir], { stdio: 'ignore' })
  } catch (error) {
    console.warn(`[desktop] No pude limpiar atributos extendidos: ${error.message}`)
  }
}
