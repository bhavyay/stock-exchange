function generateChannelArtifacts() {
  which configtxgen
  if [ "$?" -ne 0 ]; then
    echo "configtxgen tool not found. exiting"
    exit 1
  fi

  echo "#########  Generating Orderer Genesis block ##############"
  # Note: For some unknown reason (at least for now) the block file can't be
  # named orderer.genesis.block or the orderer will fail to launch!
  set -x
  FABRIC_CFG_PATH=$PWD/src/artifacts/channel configtxgen -profile TwoOrgsOrdererGenesis -outputBlock ./src/artifacts/channel/genesis.block
  res=$?
  set +x
  if [ $res -ne 0 ]; then
    echo "Failed to generate orderer genesis block..."
    exit 1
  fi
  echo "### Generating channel configuration transaction 'channel.tx' ###"
  set -x
  FABRIC_CFG_PATH=$PWD/src/artifacts/channel configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./src/artifacts/channel/mychannel.tx -channelID mychannel
  res=$?
  set +x
  if [ $res -ne 0 ]; then
    echo "Failed to generate channel configuration transaction..."
    exit 1
  fi

  echo "#######    Generating anchor peer update for Org1MSP   ##########"
  set -x
  FABRIC_CFG_PATH=$PWD/src/artifacts/channel configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./src/artifacts/channel/Org1MSPanchors.tx -channelID mychannel -asOrg Org1MSP
  res=$?
  set +x
  if [ $res -ne 0 ]; then
    echo "Failed to generate anchor peer update for Org1MSP..."
    exit 1
  fi

  echo "#######    Generating anchor peer update for Org2MSP   ##########"
  set -x
  FABRIC_CFG_PATH=$PWD/src/artifacts/channel configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate \
    ./src/artifacts/channel/Org2MSPanchors.tx -channelID mychannel -asOrg Org2MSP
  res=$?
  set +x
  if [ $res -ne 0 ]; then
    echo "Failed to generate anchor peer update for Org2MSP..."
    exit 1
  fi
  echo
}

generateChannelArtifacts