import {deployShopFactory, isValidEverAddress} from "../test/utils/common";

const prompts = require('prompts');
const ora = require('ora');


async function main() {
  console.log('\x1b[1m', '\n\nDeploy Shop Factory:')
  const response = await prompts([
    {
      type: 'text',
      name: '_owner',
      message: 'Shop Factory Owner address',
      validate: (value: string) => isValidEverAddress(value) ? true : 'Invalid Everscale address'
    },
    {
      type: 'text',
      name: '_usdt',
      message: 'Usdt root address'
    }
  ]);
  console.log('\x1b[1m', '\nSetup complete! ✔');

  const spinner = ora('Deploying Shop Factory...').start();
  const factory = await deployShopFactory(response._owner, response._usdt);
  spinner.succeed(`Shop Factory deployed: ${factory.address}`);

}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
