module.exports = async promise => {
  promise = typeof promise === 'function' ? promise() : promise
  try {
    await promise
  } catch (err) {
    return err
  }
  throw new Error('did not throw')
}
