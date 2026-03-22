import { spawn } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

await runStep('typecheck', ['run', 'typecheck'])
const buildOutput = await runStep('vite build', ['run', 'build:vite'])

if (buildOutput.includes('also statically imported by')) {
  console.error('\nBuild bloqueado: o Vite detectou imports estáticos e dinâmicos misturados no mesmo módulo.')
  process.exit(1)
}

await runStep('bundle budget', ['run', 'bundle:check'])

function runStep(label, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
    })

    let output = ''

    child.stdout.on('data', (chunk) => {
      output += chunk.toString()
      process.stdout.write(chunk)
    })

    child.stderr.on('data', (chunk) => {
      output += chunk.toString()
      process.stderr.write(chunk)
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve(output)
        return
      }

      reject(new Error(`${label} falhou com código ${code}`))
    })
  })
}
